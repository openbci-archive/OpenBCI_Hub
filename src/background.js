import net from 'net';
import { Ganglion, Constants } from 'openbci-ganglion'; // native npm module
import { Wifi } from 'openbci-wifi'; // native npm module
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
const kTcpCmdProtocol = 'p';
const kTcpCmdScan = 's';
const kTcpCmdStatus = 'q';
const kTcpCodeBadPacketData = 500;
const kTcpCodeBadBLEStartUp = 501;
const kTcpCodeSuccess = 200;
const kTcpCodeSuccessGanglionFound = 201;
const kTcpCodeSuccessAccelData = 202;
const kTcpCodeSuccessSampleData = 204;
const kTcpCodeSuccessImpedanceData = 203;
const kTcpCodeSuccessWifiShieldFound = 205;
const kTcpCodeStatusConnected = 300;
const kTcpCodeStatusDisconnected = 301;
const kTcpCodeStatusScanning = 302;
const kTcpCodeStatusNotScanning = 303;
const kTcpCodeStatusStarted = 304;
const kTcpCodeStatusStopped = 305;
const kTcpCodeErrorUnknown = 499;
const kTcpCodeErrorAlreadyConnected = 408;
const kTcpCodeErrorAccelerometerCouldNotStart = 416;
const kTcpCodeErrorAccelerometerCouldNotStop = 417;
const kTcpCodeErrorCommandNotAbleToBeSent = 406;
const kTcpCodeErrorDeviceNotFound = 405;
const kTcpCodeErrorImpedanceCouldNotStart = 414;
const kTcpCodeErrorImpedanceCouldNotStop = 415;
const kTcpCodeErrorNoOpenBleDevice = 400;
const kTcpCodeErrorProtocolUnknown = 418;
const kTcpCodeErrorProtocolBLEStart = 419;
const kTcpCodeErrorProtocolNotStarted = 420;
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
const kTcpProtocolBLE = 'ble';
const kTcpProtocolWiFi = 'wifi';
const kTcpStop = ',;\n';

let verbose = true;

let curTcpProtocol = kTcpProtocolBLE;

let ganglionHubError;
/**
 * The pointer to ganglion ble code
 * @type {Ganglion}
 */
let ganglionBLE = null;
let wifi = new Wifi({
  sendCounts: true,
  verbose: verbose
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
    if (ganglionBLE) {
      if (ganglionBLE.isConnected()) {
        ganglionBLE.manualDisconnect = true;
        ganglionBLE.disconnect(true)
          .catch((err) => {
            if (verbose) console.log(err);
          })
      }
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
  console.log(message.toString());
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
  ganglionBLE.removeAllListeners('accelerometer');
  ganglionBLE.removeAllListeners('sample');
  ganglionBLE.removeAllListeners('message');
  ganglionBLE.removeAllListeners('impedance');
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
      processCommand(msg, client);
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
    case kTcpCmdProtocol:
      processProtocol(msg, client);
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
      ganglionBLE.accelStart()
        .then(() => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeErrorAccelerometerCouldNotStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      ganglionBLE.accelStop()
        .then(() => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdAccelerometer},${kTcpCodeErrorAccelerometerCouldNotStop},${err}${kTcpStop}`);
        });
      break;
  }
};

const _processCommandBLE = (msg, client) => {
  if (_.isNull(ganglionBLE)) {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorProtocolNotStarted}${kTcpStop}`);
  }
  if (ganglionBLE.isConnected()) {
    ganglionBLE.write(msgElements[1])
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
};

const _processCommandWifi = (msg, client) => {
  if (_.isNull(wifi)) {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorProtocolNotStarted}${kTcpStop}`);
  }
  let msgElements = msg.toString().split(',');
  wifi.write(msgElements[1])
    .then(() => {
      if (verbose) console.log(`sent ${msgElements[1]} to Wifi shield`);
      client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
    })
    .catch((err) => {
      if (verbose) console.log('unable to write command', err);
      client.write(`${kTcpCmdError},${kTcpCodeErrorCommandNotAbleToBeSent},${err}${kTcpStop}`);
    });
};

const processCommand = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processCommandWifi(msg, client);
      break;
    case kTcpProtocolBLE:
    default:
      _processCommandBLE(msg, client);
      break;
  }
};

const _processConnectBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');
  if (ganglionBLE.isConnected()) {
    if (verbose) console.log('already connected');
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log(`attempting to connect to ${msgElements[1]}`);
    if (ganglionBLE.isSearching()) {
      _scanStopBLE(client, false)
        .then(() => {
          _verifyDeviceBeforeConnect(msgElements[1], client);
          return Promise.resolve();
        })
        .catch((err) => {
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          ganglionBLE.removeAllListeners('ready');
        });
    } else {
      _verifyDeviceBeforeConnect(msgElements[1], client);
    }
  }
};

const _connectWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');

  if (verbose) console.log(`attempting to connect to ${msgElements[1]}`);

  let addr = msgElements[1];
  _.forEach(localArray, (obj) => {
    if (obj.localName === addr) {
      addr = obj.ipAddress;
    }
  });



  wifi.connect(addr)
    .then(() => {
      //TODO: Finish this connect
      if (verbose) console.log("connect success");
      client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
      wifi.on('sample', sampleFunction.bind(null, client));
      wifi.on('message', messageFunction.bind(null, client));
      return Promise.resolve();
    })
    .catch((err) => {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
    })
};

const _processConnectWifi = (msg, client) => {
  console.log("uoy;sldkjf");
  if (wifi.isConnected()) {
    if (verbose) console.log('already connected');
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log("not connected going to try and connect");
    if (wifi.isSearching()) {
      wifi.searchStop()
        .then(() => {
          _connectWifi(msg, client);
        })
        .catch((err) => {
        console.log("err", err);
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          return Promise.reject();
        });
    } else {
      _connectWifi(msg, client);
    }
  }
};

/**
 * For processing incoming connect commands
 * @param msg {String} - The actual message
 * @param client {Object} - writable TCP client
 */
const processConnect = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processConnectWifi(msg, client);
      break;
    case kTcpProtocolBLE:
    default:
      _processConnectBLE(msg, client);
      break;
  }
};

const _verifyDeviceBeforeConnect = (peripheralName, client) => {
  let ganglionVerified = false;
  const verifyGanglionFound = (peripheral) => {
    const localName = peripheral.advertisement.localName;
    if (localName === peripheralName) {
      if (verbose) console.log(`Verify - Ganglion found: ${localName}`);
      ganglionBLE.removeAllListeners('ganglionFound');
      ganglionVerified = true;
      ganglionBLE.searchStop()
        .then(() => {
          _connectGanglion(peripheralName, client);
        })
        .catch((err) => {
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          ganglionBLE.removeAllListeners('ready');
        });
    }
  };
  ganglionBLE.on('ganglionFound', verifyGanglionFound);
  ganglionBLE.once(k.OBCINobleEmitterScanStart, () => {
    if (verbose) console.log(`Verify - Ganglion scan started`);
  });
  ganglionBLE.once(k.OBCINobleEmitterScanStop, () => {
    if (verbose) console.log(`Verify - Ganglion scan stopped`);
    if (!ganglionVerified) {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnectTimeout}${kTcpStop}`);
    }
    ganglionBLE.removeListener('ganglionFound', verifyGanglionFound);
  });
  ganglionBLE.searchStart(5 * 1000).catch((err) => {
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
    ganglionBLE.removeAllListeners('ready');
  });
};

const _connectGanglion = (peripheralName, client) => {
  ganglionBLE.once('ready', () => {
    if (verbose) console.log('ready!');
    client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
    ganglionBLE.on('accelerometer', accelerometerFunction.bind(null, client));
    ganglionBLE.on('sample', sampleFunction.bind(null, client));
    ganglionBLE.on('message', messageFunction.bind(null, client));
    ganglionBLE.once('close', closeFunction.bind(null, client));
  });
  ganglionBLE.connect(peripheralName, true) // Port name is a serial port name, see `.listPorts()`
    .catch((err) => {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
      ganglionBLE.removeAllListeners('ready');
    });
};

/**
 * For processing incoming disconnect commands with ganglion ble
 * @param client {Object} - writable TCP client
 */
const _processDisconnectBLE = (client) => {
  ganglionBLE.manualDisconnect = true;
  ganglionBLE.disconnect(true)
    .then(() => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`)
    })
    .catch((err) => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
    });
};

/**
 * For processing incoming disconnect commands with ganglion ble
 * @param client {Object} - writable TCP client
 */
const _processDisconnectWifi = (client) => {
  wifi.disconnect()
    .then(() => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`)
    })
    .catch((err) => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
    });
};

/**
 * For processing incoming disconnect commands
 * @param msg {String} - The actual message
 * @param client {Object} - writable TCP client
 */
const processDisconnect = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processDisconnectWifi(client);
      break;
    case kTcpProtocolBLE:
    default:
      _processDisconnectBLE(client);
      break;
  }
};

const processImpedance = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      ganglionBLE.impedanceStart()
        .then(() => {
          ganglionBLE.on(k.OBCIEmitterImpedance, impedanceFunction.bind(null, client));
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      ganglionBLE.impedanceStop()
        .then(() => {
          ganglionBLE.removeAllListeners(k.OBCIEmitterImpedance);
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStop},${err}${kTcpStop}`);
        });
      break;
  }
};

const protocolSafeStart = () => {
  if (ganglionBLE) {
    ganglionBLECleanup();
  }
  if (wifi) {
    wifiCleanup();
  }
};

const _protocolStartBLE = () => {
  return new Promise((resolve, reject) => {
    protocolSafeStart();
    ganglionBLE = new Ganglion({
      nobleScanOnPowerOn: false,
      sendCounts: true,
      verbose: verbose
    }, (err) => {
      if (err) {
        // Need to send out error to clients when they connect that there is a bad inner noble
        ganglionHubError = err;
        reject(err);
      } else {
        resolve();
      }
    });
    curTcpProtocol = kTcpProtocolBLE;
  })

};

const _protocolStartWifi = () => {
  protocolSafeStart();
  wifi = new Wifi({
    sendCounts: true,
    verbose: verbose
  });
  curTcpProtocol = kTcpProtocolWiFi;
  return Promise.resolve();
};

const _processProtocolBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      _protocolStartBLE()
        .then(() => {
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolBLE}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdProtocol},${kTcpCodeErrorProtocolBLEStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStatus:
      if (ganglionBLE.isSearching()) {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusScanning}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      if (ganglionBLE.isSearching()) {
        _scanStopBLE(client, true)
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

const _processProtocolWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      _protocolStartWifi()
        .then(() => {
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolWiFi}${kTcpStop}`);
        });
      break;
    case kTcpActionStatus:
      if (wifi) {
        client.write(`${kTcpCmdProtocol},${kTcpCodeStatusStarted}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdProtocol},${kTcpCodeStatusStopped}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      wifiCleanup();
      client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess}${kTcpStop}`);
      break;
  }
};

/**
 * For processing incoming protocol commands
 * @param msg {String} - The actual message. cmd,newProtocol,end
 * @param client {Object} - writable TCP client
 */
const processProtocol = (msg, client) => {
  if (verbose) console.log(msg);
  let msgElements = msg.toString().split(',');
  const protocol = msgElements[2];
  switch (protocol) {
    case kTcpProtocolBLE:
      _processProtocolBLE(msg, client);
      break;
    case kTcpProtocolWiFi:
      _processProtocolWifi(msg, client);
      break;
    default:
      client.write(`${kTcpCmdProtocol},${kTcpCodeErrorProtocolUnknown}${kTcpStop}`);
      break;
  }
};

const _scanStartBLE = (client) => {
  const ganglionFound = (peripheral) => {
    const localName = peripheral.advertisement.localName;
    if (verbose) console.log(`Ganglion found: ${localName}`);
    client.write(`${kTcpCmdScan},${kTcpCodeSuccessGanglionFound},${localName}${kTcpStop}`);
  };
  return new Promise((resolve, reject) => {
    ganglionBLE.on(k.OBCIEmitterGanglionFound, ganglionFound);
    ganglionBLE.once(k.OBCINobleEmitterScanStop, () => {
      ganglionBLE.removeListener(k.OBCIEmitterGanglionFound, ganglionFound);
    });
    ganglionBLE.searchStart()
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        ganglionBLE.removeAllListeners(k.OBCIEmitterGanglionFound);
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
const _scanStopBLE = (client, writeOutMessage) => {
  return new Promise((resolve, reject) => {
    if (_.isUndefined(writeOutMessage)) writeOutMessage = true;
    ganglionBLE.removeAllListeners(k.OBCIEmitterGanglionFound);
    ganglionBLE.searchStop()
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

const _processScanBLEStart = (client) => {
  if (ganglionBLE.isSearching()) {
    _scanStopBLE(client, false)
      .then(() => {
        if (verbose) console.log('scan stopped first');
        return _scanStartBLE(client);
      })
      .then(() => {
        if (verbose) console.log('scan started');
      })
      .catch((err) => {
        if (verbose) console.log(`err stopping/starting scan ${err}`);
      });
  } else {
    _scanStartBLE(client)
      .then(() => {
        if (verbose) console.log('no scan was running, before starting this scan.');
      })
      .catch((err) => {
        if (verbose) console.log(`err starting new scan ${err}`);
      });
  }
};

const _processScanBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      if (_.isNull(ganglionBLE)) {
        if (verbose) console.log("ganglion noble not started, attempting to start before scan");
        _protocolStartBLE()
          .catch((err) => {
            client.write(`${kTcpCmdScan},${kTcpCodeErrorProtocolBLEStart},${err}${kTcpStop}`);
            return Promise.resolve();
          })
          .then(() => {
            _processScanBLEStart(client);
            return Promise.resolve();
          })
          .catch((err) => {
            client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
          })

      } else {
        _processScanBLEStart(client)
      }
      break;
    case kTcpActionStatus:
      if (ganglionBLE.isSearching()) {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusScanning}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      if (ganglionBLE.isSearching()) {
        _scanStopBLE(client, true)
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
let localArray = [];
const _scanStartWifi = (client) => {
  const wifiFound = (obj) => {
    const localName = obj.localName;
    localArray.push(obj);
    if (verbose) console.log(`Wifi shield found: ${obj}`);
    client.write(`${kTcpCmdScan},${kTcpCodeSuccessWifiShieldFound},${localName}${kTcpStop}`);
  };
  return new Promise((resolve, reject) => {
    wifi.on('wifiShield', wifiFound);

    wifi.searchStart()
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        wifi.removeAllListeners('wifiShield');
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
const _scanStopWifi = (client, writeOutMessage) => {
  return new Promise((resolve, reject) => {
    if (_.isUndefined(writeOutMessage)) writeOutMessage = true;
    wifi.removeAllListeners('wifiShield');
    wifi.searchStop()
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

const _processScanWifiStart = (client) => {
  if (wifi.isSearching()) {
    if (verbose) console.log('scan stopped first');
    _scanStopWifi(client, false)
      .then(() => {
        return _scanStartWifi(client);
      })
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
      })
      .catch((err) => {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
        console.log(err);
      });
  } else {
    if (verbose) console.log('no scan was running, before starting this scan.');
    _scanStartWifi(client)
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
      })
      .catch((err) => {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStart},${err}${kTcpStop}`);
        console.log(err);
      });
  }
};

const _processScanWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      if (_.isNull(wifi)) {
        if (verbose) console.log("wifi not started, attempting to start before scan");
        _protocolStartWifi((err) => {
          if (err) {
            client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
          } else {
            _processScanWifiStart(client);
          }
        });
      } else {
        _processScanWifiStart(client);
      }
      break;
    case kTcpActionStatus:
      if (wifi.isSearching()) {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusScanning}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      if (wifi.isSearching()) {
        _scanStopWifi().catch(console.log);
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoScanToStop},${kTcpStop}`);
      }
      break;
  }
};

/**
 * For processing incoming scan commands
 * @param msg {String} - The actual message. cmd,action,end
 * @param client {Object} - writable TCP client
 */
const processScan = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processScanWifi(msg, client);
      break;
    case kTcpProtocolBLE:
    default:
      _processScanBLE(msg, client);
      break;
  }
};

const ganglionBLECleanup = () => {
  if (ganglionBLE) {
    ganglionBLE.manualDisconnect = true;
    ganglionBLE.disconnect();
    ganglionBLE.removeAllListeners('accelerometer');
    ganglionBLE.removeAllListeners('sample');
    ganglionBLE.removeAllListeners('message');
    ganglionBLE.removeAllListeners('impedance');
    ganglionBLE.removeAllListeners('ganglionFound');
    ganglionBLE.removeAllListeners('close');
    ganglionBLE.destroyNoble();
    ganglionBLE = null;
  }
};

const wifiCleanup = () => {
  if (wifi) {
    wifi.removeAllListeners('wifiShield');
    wifi.disconnect().catch(console.log);
    wifi.destroy();
    wifi = null;
  }
};



function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    ganglionBLECleanup();
    wifiCleanup();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    if (ganglionBLE) {
      if (ganglionBLE.isConnected()) {
        ganglionBLE.disconnect()
          .then(() => {
            process.exit();
          })
          .catch((err) => {
            if (verbose) console.log(err);
            process.exit();
          });
      }
    }
    if (wifi) {
      if (wifi.isConnected()) {
        wifi.disconnect()
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