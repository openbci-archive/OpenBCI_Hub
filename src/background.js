import net from 'net';
import { Ganglion, Constants } from 'openbci-ganglion'; // native npm module
import menubar from 'menubar';
import * as _ from 'lodash';

/** TCP */
const k = Constants;
const kTcpActionStart = 'start';
const kTcpActionStatus = 'status';
const kTcpActionStop = 'stop';
const kTcpCmdAccelerometer = 'a';
const kTcpCmdConnect = 'c';
const kTcpCmdCommand = 'k';
const kTcpCmdData = 't';
const kTcpCmdDisconnect = 'd';
const kTcpCmdError = 'e';
const kTcpCmdImpedance = 'i';
const kTcpCmdLog = 'l';
const kTcpCmdScan = 's';
const kTcpCmdStatus = 'q';
const kTcpCodeBadPacketData = 500;
const kTcpCodeBadBLEStartUp = 501;
const kTcpCodeSuccess = 200;
const kTcpCodeSuccessGanglionFound = 201;
const kTcpCodeSuccessAccelData = 202;
const kTcpCodeSuccessSampleData = 204;
const kTcpCodeSuccessImpedanceData = 203;
const kTcpCodeStatusConnected = 300;
const kTcpCodeStatusDisconnected = 301;
const kTcpCodeStatusScanning = 302;
const kTcpCodeStatusNotScanning = 303;
const kTcpCodeErrorUnknown = 499;
const kTcpCodeErrorAlreadyConnected = 408;
const kTcpCodeErrorAccelerometerCouldNotStart = 416;
const kTcpCodeErrorAccelerometerCouldNotStop = 417;
const kTcpCodeErrorCommandNotAbleToBeSent = 406;
const kTcpCodeErrorDeviceNotFound = 405;
const kTcpCodeErrorImpedanceCouldNotStart = 414;
const kTcpCodeErrorImpedanceCouldNotStop = 415;
const kTcpCodeErrorNoOpenBleDevice = 400;
const kTcpCodeErrorUnableToConnect = 402;
const kTcpCodeErrorUnableToConnectTimeout = 413;
const kTcpCodeErrorUnableToDisconnect = 401;
const kTcpCodeErrorScanAlreadyScanning = 409;
const kTcpCodeErrorScanNoneFound = 407;
const kTcpCodeErrorScanNoScanToStop = 410;
const kTcpCodeErrorScanCouldNotStart = 412;
const kTcpCodeErrorScanCouldNotStop = 411;
const kTcpHost = '127.0.0.1';
const kTcpPort = 10996;
const kTcpStop = ',;\n';

let verbose = false;
let ganglionHubError;
let ganglion = new Ganglion({
  nobleScanOnPowerOn: false,
  sendCounts: true,
  verbose: verbose
}, (error) => {
  // Need to send out error to clients when they connect that there is a bad inner noble
  ganglionHubError = error;
});

// Start a TCP Server
net.createServer((client) => {
  // Identify this client
  client.name = `${client.remoteAddress}:${client.remotePort}`;

  if (verbose) console.log(`Welcome ${client.name}`);

  if (ganglionHubError) {
    client.write(`${kTcpCmdStatus},${kTcpCodeBadBLEStartUp}${kTcpStop}`);
  } else {
    client.write(`${kTcpCmdStatus},${kTcpCodeSuccess}${kTcpStop}`);
  }

  // Handle incoming messages from clients.
  client.on('data', (data) => {
    if (verbose) {
      console.log(`server got: ${data} from ${client.name}`);
    }
    parseMessage(data, client);
  });

  // Remove the client from the list when it leaves
  client.on('end', () => {
    if (verbose) {
      console.log(`${client.name} has left`);
    }
    client.removeAllListeners('data');
    client.removeAllListeners('end');
    client.removeAllListeners('error');
    if (ganglion.isConnected()) {
      ganglion.manualDisconnect = true;
      ganglion.disconnect(true)
        .catch((err) => {
          if (verbose) console.log(err);
        })
    }
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

/**
 * Called when an accelerometer array is emitted.
 * @param client {Object}
 *  A TCP `net` client
 * @param accelDataCounts {Array}
 *  Array of counts, no gain.
 */
var accelerometerFunction = (client, accelDataCounts) => {
  let packet = `${kTcpCmdAccelerometer},${kTcpCodeSuccessAccelData}`;
  for (var j = 0; j < accelDataCounts.length; j++) {
    packet += ',';
    packet += accelDataCounts[j];
  }
  packet += `${kTcpStop}`;
  client.write(packet);
};

/**
 * Called when a new sample is emitted.
 * @param client {Object}
 *  A TCP `net` client
 * @param sample {Object}
 *  `sampleNumber` {number}
 *  `channelDataCounts` {Array} Array of counts, no gain.
 *  A sample object.
 */
var sampleFunction = (client, sample) => {
  let packet = `${kTcpCmdData},${kTcpCodeSuccessSampleData},`;
  packet += sample.sampleNumber;
  for (var j = 0; j < sample.channelDataCounts.length; j++) {
    packet += ',';
    packet += sample.channelDataCounts[j];
  }
  packet += `${kTcpStop}`;
  client.write(packet);
};

/**
 * Called when a new message is received by the node driver.
 * @param client {Object}
 *  A TCP `net` client
 * @param message {Buffer}
 *  The message...
 */
var messageFunction = (client, message) => {
  const packet = `${kTcpCmdLog},${kTcpCodeSuccess},${message.toString()}${kTcpStop}`;
  client.write(packet);
};

/**
 * Called when a new impedance value is received by the node driver.
 * @param client {Object}
 *  A TCP `net` client
 * @param impedanceObj {Object}
 *  - `channelNumber` {Number} - Channels 1, 2, 3, 4 or 0 for reference
 *  - `impedanceValue` {Number} - The impedance value in ohms
 */
var impedanceFunction = (client, impedanceObj) => {
  const packet = `${kTcpCmdImpedance},${kTcpCodeSuccessImpedanceData},${impedanceObj.channelNumber},${impedanceObj.impedanceValue}${kTcpStop}`;
  client.write(packet);
};

var closeFunction = (client) => {
  if (verbose) console.log('close event fired');
  ganglion.removeAllListeners('accelerometer');
  ganglion.removeAllListeners('sample');
  ganglion.removeAllListeners('message');
  ganglion.removeAllListeners('impedance');
  if (!client.destroyed) {
    client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
  }
};

var parseMessage = (msg, client) => {
  let msgElements = msg.toString().split(',');
  // var char = String.fromCharCode(msg[0])
  // console.log('msgElements[0]',msgElements[0],char)
  switch (msgElements[0]) {
    case kTcpCmdConnect:
      processConnect(msg, client);
      break;
    case kTcpCmdCommand:
      if (ganglion.isConnected()) {
        ganglion.write(msgElements[1])
          .then(() => {
            if (verbose) console.log(`sent ${msgElements[1]} to Ganglion`);
            client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
          })
          .catch((err) => {
            if (verbose) console.log('unable to write command', err);
            client.write(`${kTcpCmdError},${kTcpCodeErrorCommandNotAbleToBeSent},${err}${kTcpStop}`);
          });
      } else {
        client.write(`${kTcpCmdCommand},${kTcpCodeErrorNoOpenBleDevice}${kTcpStop}`);
      }
      break;
    case kTcpCmdDisconnect:
      processDisconnect(msg, client);
      break;
    case kTcpCmdAccelerometer:
      processAccelerometer(msg, client);
      break;
    case kTcpCmdImpedance:
      processImpedance(msg, client);
      break;
    case kTcpCmdScan:
      processScan(msg, client);
      break;
    case kTcpCmdStatus:
      // A simple loop back
      client.write(`${kTcpCmdStatus},${kTcpCodeSuccess}${kTcpStop}`);
      break;
    case kTcpCmdError:
    default:
      client.write(`${kTcpCmdError},${kTcpCodeBadPacketData},Error: command not recognized${kTcpStop}`);
      break;
  }
};

const processAccelerometer = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      ganglion.accelStart()
        .then(() => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeErrorAccelerometerCouldNotStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      ganglion.accelStop()
        .then(() => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeErrorAccelerometerCouldNotStop},${err}${kTcpStop}`);
        });
      break;
  }
};

const processConnect = (msg, client) => {
  let msgElements = msg.toString().split(',');
  if (ganglion.isConnected()) {
    if (verbose) console.log('already connected');
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log(`attempting to connect to ${msgElements[1]}`);
    if (ganglion.isSearching()) {
      _scanStop(client, false)
        .then(() => {
          _verifyDeviceBeforeConnect(msgElements[1], client);
          return Promise.resolve();
        })
        .catch((err) => {
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          ganglion.removeAllListeners('ready');
        });
    } else {
      _verifyDeviceBeforeConnect(msgElements[1], client);
    }
  }
};

const _verifyDeviceBeforeConnect = (peripheralName, client) => {
  let ganglionVerified = false;
  const verifyGanglionFound = (peripheral) => {
    const localName = peripheral.advertisement.localName;
    if (localName === peripheralName) {
      if (verbose) console.log(`Verify - Ganglion found: ${localName}`);
      ganglion.removeAllListeners('ganglionFound');
      ganglionVerified = true;
      ganglion.searchStop()
        .then(() => {
          _connect(peripheralName, client);
        })
        .catch((err) => {
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          ganglion.removeAllListeners('ready');
        });
    }
  };
  ganglion.on('ganglionFound', verifyGanglionFound);
  ganglion.once(k.OBCINobleEmitterScanStart, () => {
    if (verbose) console.log(`Verify - Ganglion scan started`);
  });
  ganglion.once(k.OBCINobleEmitterScanStop, () => {
    if (verbose) console.log(`Verify - Ganglion scan stopped`);
    if (!ganglionVerified) {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnectTimeout}${kTcpStop}`);
    }
    ganglion.removeListener('ganglionFound', verifyGanglionFound);
  });
  ganglion.searchStart(5 * 1000).catch((err) => {
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
    ganglion.removeAllListeners('ready');
  });
};

const _connect = (peripheralName, client) => {
  ganglion.once('ready', () => {
    if (verbose) console.log('ready!');
    client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
    ganglion.on('accelerometer', accelerometerFunction.bind(null, client));
    ganglion.on('sample', sampleFunction.bind(null, client));
    ganglion.on('message', messageFunction.bind(null, client));
    ganglion.once('close', closeFunction.bind(null, client));
  });
  ganglion.connect(peripheralName, true) // Port name is a serial port name, see `.listPorts()`
    .catch((err) => {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
      ganglion.removeAllListeners('ready');
    });
};

/**
 * For processing incoming disconnect commands
 * @param msg {String} - The actual message
 * @param client {Object} - writable TCP client
 */
const processDisconnect = (msg, client) => {
  ganglion.manualDisconnect = true;
  ganglion.disconnect(true)
    .then(() => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`)
    })
    .catch((err) => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
    });
};

const processImpedance = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      ganglion.impedanceStart()
        .then(() => {
          ganglion.on(k.OBCIEmitterImpedance, impedanceFunction.bind(null, client));
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      ganglion.impedanceStop()
        .then(() => {
          ganglion.removeAllListeners(k.OBCIEmitterImpedance);
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStop},${err}${kTcpStop}`);
        });
      break;
  }
};

const _scanStart = (client) => {
  const ganglionFound = (peripheral) => {
    const localName = peripheral.advertisement.localName;
    if (verbose) console.log(`Ganglion found: ${localName}`);
    client.write(`${kTcpCmdScan},${kTcpCodeSuccessGanglionFound},${localName}${kTcpStop}`);
  };
  return new Promise((resolve, reject) => {
    ganglion.on(k.OBCIEmitterGanglionFound, ganglionFound);
    ganglion.once(k.OBCINobleEmitterScanStop, () => {
      ganglion.removeListener(k.OBCIEmitterGanglionFound, ganglionFound);
    });
    ganglion.searchStart()
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        ganglion.removeAllListeners(k.OBCIEmitterGanglionFound);
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
        reject(err);
      });
  });
};

/**
 * Stop a scan
 * @param client
 * @param writeOutMessage
 * @return {Promise}
 * @private
 */
const _scanStop = (client, writeOutMessage) => {
  return new Promise((resolve, reject) => {
    if (_.isUndefined(writeOutMessage)) writeOutMessage = true;
    ganglion.removeAllListeners(k.OBCIEmitterGanglionFound);
    ganglion.searchStop()
      .then(() => {
        if (writeOutMessage) client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
        reject(err);
      });
  });
};

const processScan = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      if (ganglion.isSearching()) {
        _scanStop(client, false)
          .then(() => {
            if (verbose) console.log('scan stopped first');
            return _scanStart(client);
          })
          .then(() => {
            if (verbose) console.log('scan started');
          })
          .catch((err) => {
            if (verbose) console.log(`err stopping/starting scan ${err}`);
          });
      } else {
        _scanStart(client)
          .then(() => {
            if (verbose) console.log('no scan was running, before starting this scan.');
          })
          .catch((err) => {
            if (verbose) console.log(`err starting new scan ${err}`);
          });
      }
      break;
    case kTcpActionStatus:
      if (ganglion.isSearching()) {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusScanning}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      if (ganglion.isSearching()) {
        _scanStop(client, true)
          .then(() => {
            if (verbose) console.log(`stopped scan`);
          })
          .catch((err) => {
            if (verbose) console.log(`err starting new scan ${err}`);
          });
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoScanToStop},${kTcpStop}`);
      }
      break;
  }
};

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
    ganglion.manualDisconnect = true;
    ganglion.disconnect();
    ganglion.removeAllListeners('accelerometer');
    ganglion.removeAllListeners('sample');
    ganglion.removeAllListeners('message');
    ganglion.removeAllListeners('impedance');
    ganglion.removeAllListeners('ganglionFound');
    ganglion.removeAllListeners('close');
    ganglion.destroyNoble();
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

let mb = menubar({
  icon: './resources/icons/icon.png'
});

mb.on('ready', function ready () {
  console.log('app is ready');
  // your app code here
});

mb.on('after-close', function () {
  exitHandler.bind(null, {
    cleanup: true
  });
});