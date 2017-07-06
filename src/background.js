import net from 'net';
import { Ganglion, Constants } from 'openbci-ganglion'; // native npm module
import menubar from 'menubar';
import * as _ from 'lodash';
import JSONStream from 'json-stream';
import http from 'http';
import ip from 'ip';
import { Client } from 'node-ssdp';


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
let streamJSON = JSONStream();
streamJSON.on("data", (sample) => {
  console.log(JSON.stringify(sample));
});

let curTcpProtocol = kTcpProtocolBLE;

let ganglionHubError;
/**
 * The pointer to ganglion ble code
 * @type {Ganglion}
 */
let ganglionBLE = null;


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
    if (ganglionBLE.isConnected()) {
      ganglionBLE.manualDisconnect = true;
      ganglionBLE.disconnect(true)
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

let persistentBuffer = null;
const delimBuf = new Buffer("\r\n");

// Start a TCP Server
let wifiServer = null;
let wifiClient = null;
let ssdpTimeout = null;

const wifiProcessResponse = (res, cb) => {
  if (verbose) {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  }
  res.setEncoding('utf8');
  let msg = '';
  res.on('data', (chunk) => {
    if (verbose) console.log(`BODY: ${chunk}`);
    msg += chunk.toString();
  });
  res.once('end', () => {
    if (verbose) console.log('No more data in response.');
    console.log('res', msg);
    if (res.statusCode !== 200) {
      if (cb) cb(msg);
    } else {
      if (cb) cb();
    }
  });
};

const wifiPost = (host, path, payload, cb) => {
  const output = JSON.stringify(payload);
  const options = {
    host: host,
    port: 80,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': output.length
    }
  };

  const req = http.request(options, (res) => {
    wifiProcessResponse(res, (err) => {
      if (err) {
        if (cb) cb(err);
      } else {
        if (cb) cb();
      }
    });
  });

  req.once('error', (e) => {
    if (verbose) console.log(`problem with request: ${e.message}`);
    if (cb) cb(e);
  });

  // write data to request body
  req.write(output);
  req.end();
};

let shield_uuid = "openbci-2af1.local";
wifiPost(shield_uuid, '/tcp', {
  ip: ip.address(),
  output: "json",
  port: wifiServer.address().port,
  delimiter: true,
  latency: 10000
}, (err) => {
  if (err) console. log("err", err);
  else {
    wifiPost(shield_uuid, '/command', {'command': 'b'});
  }
});

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

/**
 * For processing incoming connect commands
 * @param msg {String} - The actual message
 * @param client {Object} - writable TCP client
 */
const processConnect = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
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
          _connect(peripheralName, client);
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

const _connect = (peripheralName, client) => {
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
 * For processing incoming disconnect commands
 * @param msg {String} - The actual message
 * @param client {Object} - writable TCP client
 */
const processDisconnect = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
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
  if (wifiServer) {
    wifiServerCleanup();
  }
};

const _protocolStartBLE = (cb) => {
  protocolSafeStart();
  ganglionBLE = new Ganglion({
    nobleScanOnPowerOn: false,
    sendCounts: true,
    verbose: verbose
  }, (err) => {
    if (err) {
      // Need to send out error to clients when they connect that there is a bad inner noble
      ganglionHubError = err;
      if (cb) cb(err);
    } else {
      if (cb) cb();
    }
  });
  curTcpProtocol = kTcpProtocolBLE;
};

const _protocolStartWifi = (cb) => {
  protocolSafeStart();
  wifiServer = net.createServer((_client) => {
    // Identify this client
    _client.name = `${_client.remoteAddress}:${_client.remotePort}`;

    if (verbose) console.log(`Welcome ${_client.name}`);


    // Handle incoming messages from clients.
    _client.on('data', (data) => {
      if (persistentBuffer !== null) persistentBuffer = Buffer.concat([persistentBuffer, data]);
      else persistentBuffer = data;

      if (persistentBuffer) {
        let bytesIn = persistentBuffer.byteLength;
        if (bytesIn > 2) {
          let head = 2;
          let tail = 0;
          while (head < bytesIn - 2) {
            if (delimBuf.compare(persistentBuffer, head-2, head) === 0) {
              try {
                const obj = JSON.parse(persistentBuffer.slice(tail, head-2));
                console.log(persistentBuffer.slice(tail, head-2).toString());
                if (head < bytesIn - 2) {
                  tail = head;
                }
              } catch (e) {
                console.log(persistentBuffer.slice(tail, head-2).toString());
                persistentBuffer = persistentBuffer.slice(head);
                return;
              }

            }
            head++;
          }

          if (tail < bytesIn - 2) {
            persistentBuffer = persistentBuffer.slice(tail);
          } else {
            persistentBuffer = null;
          }

        }
      }
    });

    // Remove the client from the list when it leaves
    _client.on('end', () => {
      if (verbose) {
        console.log(`${_client.name} has left`);
      }
      _client.removeAllListeners('data');
      _client.removeAllListeners('end');
      _client.removeAllListeners('error');
    });

    _client.on('error', (err) => {
      if (verbose) {
        console.log(`Error from ${_client.name}: ${err}`);
      }
    });
  }).listen();

  if (verbose) {
    console.log(`wifi server listening on port ${ip.address()}:${wifiServer.address().port}`);
  }
  if (cb) cb();
  curTcpProtocol = kTcpProtocolWiFi;

};

/**
 * For processing incoming protocol commands
 * @param msg {String} - The actual message. cmd,newProtocol,end
 * @param client {Object} - writable TCP client
 */
const processProtocol = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const protocol = msgElements[1];
  switch (protocol) {
    case kTcpProtocolBLE:
      _protocolStartBLE((err) => {
        if (err) {
          client.write(`${kTcpCmdProtocol},${kTcpCodeErrorProtocolBLEStart},${err}${kTcpStop}`);
        } else {
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolBLE}${kTcpStop}`);
        }
      });
      break;
    case kTcpProtocolWiFi:
      _protocolStartWifi(client);
      break;
    default:
      client.write(`${kTcpCmdProtocol},${kTcpCodeErrorProtocolUnknown}${kTcpStop}`);
      break;
  }
  ganglionBLE.manualDisconnect = true;
  ganglionBLE.disconnect(true)
    .then(() => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
    })
    .catch((err) => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
    });
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
        if (verbose) console.log("ganglion hub not started, attempting to start before scan");
        _protocolStartBLE((err) => {
          if (err) => {
            client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
          } else {
            _processScanBLEStart(client);
          }
        });
      } else {
        _processScanBLEStart(client);
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

const _scanStartWifi = (client, timeout, attempts) => {
  wifiClient = new Client({});
  let attemptCounter = 0;
  let _attempts = attempts || 2;
  let _timeout = timeout || 5 * 1000;
  let timeoutFunc = () => {
    if (attemptCounter < _attempts) {
      wifiClient.stop();
      wifiClient.search('urn:schemas-upnp-org:device:Basic:1');
      attemptCounter++;
      if (verbose) console.log(`SSDP: still trying to find a board - attempt ${attemptCounter} of ${_attempts}`);
      ssdpTimeout = setTimeout(timeoutFunc, _timeout);
    } else {
      wifiClient.stop();
      clearTimeout(ssdpTimeout);
      if (verbose) console.log('SSDP: stopping because out of attemps');
    }
  };
  wifiClient.on('response', (headers, code, rinfo) => {
    if (verbose) console.log('SSDP:Got a response to an m-search:\n%d\n%s\n%s', code, JSON.stringify(headers, null, '  '), JSON.stringify(rinfo, null, '  '));
    const _ip = rinfo.address;
    client.write(`${kTcpCmdScan},${kTcpCodeSuccessWifiShieldFound},${_ip}${kTcpStop}`);
  });
  // Search for just the wifi shield
  wifiClient.search('urn:schemas-upnp-org:device:Basic:1');
  ssdpTimeout = setTimeout(timeoutFunc, _timeout);
};

const _scanStopWifi = () => {
  if (wifiClient) {
    wifiClient.stop();
    wifiClient.removeAllListeners('response');
  }
  if (ssdpTimeout) {
    clearTimeout(ssdpTimeout);
    ssdpTimeout = null;
  }
};

const _processScanWifiStart = (client) => {
  if (ssdpTimeout) {
    if (verbose) console.log('scan stopped first');
    _scanStopWifi();
    if (verbose) console.log('scan started');
    _scanStartWifi(client);
  } else {
    if (verbose) console.log('no scan was running, before starting this scan.');
    _scanStartWifi(client);
  }
};

const _processScanWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      if (_.isNull(wifiClient)) {
        if (verbose) console.log("ganglion hub not started, attempting to start before scan");
        _protocolStartWifi((err) => {
          if (err) => {
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
      if (!_.isNull(ssdpTimeout)) {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusScanning}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdScan},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      if (!_.isNull(ssdpTimeout)) {
        _scanStopWifi();
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

const wifiServerCleanup = () => {
  if (wifiServer) {
    wifiServer.stop();
    wifiServer = null;
  }
};

const wifiClientCleanup =  () => {
  if (wifiClient) {
    wifiClient.stop();
  }
  wifiClient = null;
};

function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
    // console.log(connectedPeripheral)
    streamJSON.removeAllListeners('data');
    streamJSON = null;
    ganglionBLECleanup();
    wifiServerCleanup();
    wifiClientCleanup();
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
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