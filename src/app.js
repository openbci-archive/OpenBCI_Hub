// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import net from 'net';
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
import { Ganglion } from 'openbci';
import { greet } from './hello_world/hello_world'; // code authored by you in this project
import env from './env';
import * as _ from 'underscore';

console.log('Loaded environment variables:', env);

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());

// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
console.log('The author of this app is:', appDir.read('package.json', 'json').author);

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('greet').innerHTML = greet();
  document.getElementById('platform-info').innerHTML = os.platform();
  document.getElementById('env-name').innerHTML = env.name;
});

/** TCP */
const kTcpCmdConnect = 'c';
const kTcpCmdCommand = 'k';
const kTcpCmdData = 't';
const kTcpCmdDisconnect = 'd';
const kTcpCmdError = 'e';
const kTcpCmdImpedance = 'z';
const kTcpCmdLog = 'l';
const kTcpCmdScan = 's';
const kTcpCmdStatus = 'q';
const kTcpCodeBadPacketData = 500;
const kTcpCodeSuccess = 200;
const kTcpCodeErrorAlreadyConnected = 408;
const kTcpCodeErrorCommandNotRecognized = 406;
const kTcpCodeErrorDeviceNotFound = 405;
const kTcpCodeErrorNoOpenBleDevice = 400;
const kTcpCodeErrorUnableToConnect = 402;
const kTcpCodeErrorUnableToDisconnect = 401;
const kTcpCodeErrorScanAlreadyScanning = 409;
const kTcpCodeErrorScanNoneFound = 407;
const kTcpHost = '127.0.0.1';
const kTcpPort = 10996;
const kTcpStop = ',;\n';

let verbose = true;
let ganglion = new Ganglion({
  verbose: verbose
});

let clients = [];

// Start a TCP Server
net.createServer((client) => {
  // Identify this client
  client.name = `${client.remoteAddress}:${client.remotePort}`;

  if (this.options.verbose) {
    console.log(`Welcome ${client.name}`);
  }

  // Put this new client in the list
  clients.push(client);

  // Handle incoming messages from clients.
  client.on('data', (data) => {
    if (this.options.verbose) {
      console.log(`server got: ${data} from ${client.name}`);
    }
    this.parseMessage(data, client);
  });

  // Remove the client from the list when it leaves
  client.on('end', () => {
    clients.splice(clients.indexOf(client), 1);
    if (this.options.verbose) {
      console.log(`${client.name} has left`);
    }
    client.removeAllListeners('data');
    client.removeAllListeners('end');
    client.removeAllListeners('error');
  });

  client.on('error', (err) => {
    if (this.options.verbose) {
      console.log(`Error from ${client.name}: ${err}`);
    }
  });
}).listen({
  port: kTcpPort,
  host: kTcpHost
});

if (this.options.verbose) {
  console.log(`server listening on port ${kTcpHost}:${kTcpPort}`);
}

var broadcast = (message) => {
  clients.forEach((client) => {
    // console.log(`client:`,client, `sending ${message}`)
    client.write(message);
  });
};

var sampleFunction = (sample) => {
  var packet = '';
  packet = `${kTcpCmdData},${kTcpCodeSuccess},`;
  packet += sample.sampleNumber;
  for (var j = 0; j < sample.channelData.length; j++) {
    packet += ',';
    packet += sample.channelData[j];
  }
  packet += `${kTcpStop}`;
  broadcast(packet);
};

var parseMessage = (msg, client) => {
  let msgElements = msg.toString().split(',');
  // var char = String.fromCharCode(msg[0])
  // console.log('msgElements[0]',msgElements[0],char)
  switch (msgElements[0]) {
    case kTcpCmdConnect:
      if (ganglion.isConnected()) {
        if (verbose) console.log('already connected');
        client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
      } else {
        if (verbose) console.log(`attempting to connect to ${msgElements[1]}`);
        ganglion.connect(msgElements[1]) // Port name is a serial port name, see `.listPorts()`
          .then(() => {
            client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
            ganglion.on('sample', sampleFunction);
          })
          .catch((err) => {
            client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
          });
      }
      break;
    case kTcpCmdCommand:
      if (ganglion.isConnected()) {
        ganglion.write(msgElements[1])
          .then(() => {
            if (verbose) console.log(`sent ${msgElements[1]} to Ganglion`);
            client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
          })
          .catch((err) => {
            if (verbose) console.log('sendCharacteristic not set');
            client.write(`${kTcpCmdError},${err}${kTcpStop}`);
          });
      } else {
        client.write(`${kTcpCmdCommand},${kTcpCodeErrorNoOpenBleDevice}${kTcpStop}`);
      }
      break;
    case kTcpCmdDisconnect:
      ganglion.manualDisconnect = true;
      ganglion.disconnect()
        .then(() => {
          client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
        })
        .catch(() => {
          client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect}${kTcpStop}`);
        });
      break;
    case kTcpCmdScan:
      if (ganglion.isScanning()) {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanAlreadyScanning}${kTcpStop}`);
      } else {
        ganglion.listPeripherals()
          .then((list) => {
            let output = `${kTcpCmdScan}`;
            output = `${output},${kTcpCodeSuccess}`;
            _.each((list, localName) => {
              output = `${output},${localName}`;
            });
            client.write(`${output}${kTcpStop}`);
          })
          .catch((err) => {
            client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoneFound},${err}${kTcpStop}`);
          });
        this._nobleScanStart(client);
      }
      break;
    case kTcpCmdStatus:
      if (ganglion.isConnected()) {
        client.write(`${kTcpCmdStatus},${kTcpCodeSuccess},true${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdStatus},${kTcpCodeSuccess},false${kTcpStop}`);
      }
      break;
    case kTcpCmdError:
    default:
      client.write(`${kTcpCmdError},${kTcpCodeBadPacketData},Error: command not recognized${kTcpStop}`);
      break;
  }
};

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
    ganglion.manualDisconnect = true;
    ganglion.disconnect();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    if (ganglion.isConnected()) {
      ganglion.disconnect()
        .then(() => {
          process.exit();
        })
        .catch((err) => {
          if (verbose) console.log(err);
          process.exit();
        });
    }
  }
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, {
  cleanup: true
}));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true
}));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true
}));
