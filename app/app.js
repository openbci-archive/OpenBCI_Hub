(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = _interopDefault(require('os'));
var net = _interopDefault(require('net'));
var electron = require('electron');
var jetpack = _interopDefault(require('fs-jetpack'));
var openbci = require('openbci');

var greet = function () {
    return 'Hello World!';
};

// Simple wrapper exposing environment variables to rest of the code.

var env = jetpack.cwd(__dirname).read('env.json', 'json');

// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
// native node.js module
// native electron module
// module loaded from npm
// code authored by you in this project
console.log('Loaded environment variables:', env);

var app = electron.remote.app;
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
const kTcpCmdScan = 's';
const kTcpCmdStatus = 'q';
const kTcpCodeBadPacketData = 500;
const kTcpCodeSuccess = 200;
const kTcpCodeErrorAlreadyConnected = 408;
const kTcpCodeErrorNoOpenBleDevice = 400;
const kTcpCodeErrorUnableToConnect = 402;
const kTcpCodeErrorUnableToDisconnect = 401;
const kTcpCodeErrorScanAlreadyScanning = 409;
const kTcpCodeErrorScanNoneFound = 407;
const kTcpHost = '127.0.0.1';
const kTcpPort = 10996;
const kTcpStop = ',;\n';

let verbose = true;
let ganglion = new openbci.Ganglion({
  verbose: verbose
});

let clients = [];

// Start a TCP Server
net.createServer((client) => {
  // Identify this client
  client.name = `${client.remoteAddress}:${client.remotePort}`;

  if (verbose) {
    console.log(`Welcome ${client.name}`);
  }

  // Put this new client in the list
  clients.push(client);

  // Handle incoming messages from clients.
  client.on('data', (data) => {
    if (verbose) {
      console.log(`server got: ${data} from ${client.name}`);
    }
    parseMessage(data, client);
  });

  // Remove the client from the list when it leaves
  client.on('end', () => {
    clients.splice(clients.indexOf(client), 1);
    if (verbose) {
      console.log(`${client.name} has left`);
    }
    client.removeAllListeners('data');
    client.removeAllListeners('end');
    client.removeAllListeners('error');
  });

  client.on('error', (err) => {
    if (verbose) {
      console.log(`Error from ${client.name}: ${err}`);
    }
  });
}).listen({
  port: kTcpPort,
  host: kTcpHost
});

if (verbose) {
  console.log(`server listening on port ${kTcpHost}:${kTcpPort}`);
}

var broadcast = (message) => {
  clients.forEach((client) => {
    // console.log(`client:`,client, `sending ${message}`)
    client.write(message);
  });
};

/**
 * Called when a new sample is emitted.
 * @param sample {Object}
 *  A sample object.
 */
var sampleFunction = (sample) => {
  let packet = '';
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
        ganglion.on(openbci.k.OBCIEmitterReady, () => {
          client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
          ganglion.on('sample', sampleFunction);
        });
        ganglion.connect(msgElements[1]) // Port name is a serial port name, see `.listPorts()`
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
        ganglion.on(openbci.k.OBCIEmitterGanglionFound, (peripheral) => {
          const localName = peripheral.advertisement.localName;
          client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${localName}${kTcpStop}`);
        });

        ganglion.searchStart()
          .catch((err) => {
            client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoneFound},${err}${kTcpStop}`);
          });
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
}());
//# sourceMappingURL=app.js.map