import net from 'net';
import Ganglion from 'openbci-ganglion'; // native npm module
import Wifi from 'openbci-wifi';
import { Constants } from 'openbci-utilities';
import Cyton from 'openbci-cyton';
import menubar from 'menubar';
import * as _ from 'lodash';
import { ipcMain, dialog } from 'electron';
import path from 'path';

/** TCP */
const k = Constants;
const kTcpActionSet = 'set';
const kTcpActionStart = 'start';
const kTcpActionStatus = 'status';
const kTcpActionStop = 'stop';
const kTcpCmdAccelerometer = 'a';
const kTcpCmdAuxData = 'g';
const kTcpCmdBoardType = 'b';
const kTcpCmdChannelSettings = 'r';
const kTcpCmdConnect = 'c';
const kTcpCmdCommand = 'k';
const kTcpCmdData = 't';
const kTcpCmdDisconnect = 'd';
const kTcpCmdDriver = 'f';
const kTcpCmdError = 'e';
const kTcpCmdExamine = 'x';
const kTcpCmdImpedance = 'i';
const kTcpCmdLog = 'l';
const kTcpCmdProtocol = 'p';
const kTcpCmdScan = 's';
const kTcpCmdSd = 'm';
const kTcpCmdStatus = 'q';
const kTcpCmdWifi = 'w';
const kTcpCodeBadPacketData = 500;
const kTcpCodeBadBLEStartUp = 501;
const kTcpCodeErrorUnknown = 499;
const kTcpCodeErrorAlreadyConnected = 408;
const kTcpCodeErrorAccelerometerCouldNotStart = 416;
const kTcpCodeErrorAccelerometerCouldNotStop = 417;
const kTcpCodeErrorChannelSettings = 423;
const kTcpCodeErrorChannelSettingsSyncInProgress = 422;
const kTcpCodeErrorChannelSettingsFailedToSetChannel = 424;
const kTcpCodeErrorChannelSettingsFailedToParse = 425;
const kTcpCodeErrorCommandNotAbleToBeSent = 406;
const kTcpCodeErrorCommandNotRecognized = 434;
const kTcpCodeErrorDeviceNotFound = 405;
const kTcpCodeErrorImpedanceCouldNotStart = 414;
const kTcpCodeErrorImpedanceCouldNotStop = 415;
const kTcpCodeErrorImpedanceFailedToSetImpedance = 430;
const kTcpCodeErrorImpedanceFailedToParse = 431;
const kTcpCodeErrorNoOpenBleDevice = 400;
const kTcpCodeErrorProtocolUnknown = 418;
const kTcpCodeErrorProtocolBLEStart = 419;
const kTcpCodeErrorProtocolNotStarted = 420;
const kTcpCodeErrorUnableToConnect = 402;
const kTcpCodeErrorUnableToConnectTimeout = 413;
const kTcpCodeErrorUnableToDisconnect = 401;
const kTcpCodeErrorUnableToSetBoardType = 421;
const kTcpCodeErrorScanAlreadyScanning = 409;
const kTcpCodeErrorScanNoneFound = 407;
const kTcpCodeErrorScanNoScanToStop = 410;
const kTcpCodeErrorScanCouldNotStart = 412;
const kTcpCodeErrorScanCouldNotStop = 411;
const kTcpCodeErrorSDNotSupportedForGanglion = 433;
const kTcpCodeErrorWifiActionNotRecognized = 427;
const kTcpCodeErrorWifiCouldNotEraseCredentials = 428;
const kTcpCodeErrorWifiCouldNotSetLatency = 429;
const kTcpCodeErrorWifiNeedsUpdate = 435;
const kTcpCodeErrorWifiNotConnected = 426;
const kTcpCodeSuccess = 200;
const kTcpCodeSuccessGanglionFound = 201;
const kTcpCodeSuccessAccelData = 202;
const kTcpCodeSuccessSampleData = 204;
const kTcpCodeSuccessImpedanceData = 203;
const kTcpCodeSuccessWifiShieldFound = 205;
const kTcpCodeSuccessSerialDeviceFound = 206;
const kTcpCodeSuccessChannelSetting = 207;
const kTcpCodeStatusConnected = 300;
const kTcpCodeStatusDisconnected = 301;
const kTcpCodeStatusScanning = 302;
const kTcpCodeStatusNotScanning = 303;
const kTcpCodeStatusStarted = 304;
const kTcpCodeStatusStopped = 305;
const kTcpCodeTimeoutScanStopped = 432;
const kTcpInternetProtocolTCP = 'tcp';
const kTcpInternetProtocolUDP = 'udp';
const kTcpInternetProtocolUDPBurst = 'udpBurst';
const kTcpHost = '127.0.0.1';
const kTcpPort = 10996;
const kTcpProtocolBLE = 'ble';
const kTcpProtocolBLED112 = 'bled112';
const kTcpProtocolSerial = 'serial';
const kTcpProtocolSimulator = 'simulator';
const kTcpProtocolWiFi = 'wifi';
const kTcpStop = ',;\n';
const kTcpWifiEraseCredentials = 'eraseCredentials';
const kTcpWifiGetFirmwareVersion = 'getFirmwareVersion';
const kTcpWifiGetIpAddress = 'getIpAddress';
const kTcpWifiGetMacAddress = 'getMacAddress';
const kTcpWifiGetTypeOfAttachedBoard = 'getTypeOfAttachedBoard';

ipcMain.on("quit", () => {
  mb.app.quit();
});

const debug = true;
const verbose = true;
const sendCounts = true;

/**
 *
 */
// let ganglion = new Ganglion({
//   bled112: true,
//   debug: true,
//   nobleScanOnPowerOn: true,
//   sendCounts: true,
//   verbose: verbose
// }, (error) => {
//   if (error) {
//     console.log(error);
//   } else {
//     if (verbose) {
//       console.log('Ganglion initialize completed');
//     }
//   }
// });
//
// function errorFunc (err) {
//   throw err;
// }
//
// const impedance = false;
// const accel = false;
// const DO_PACKET_CALCULATIONS = true;
//
// ganglion.once(k.OBCIEmitterGanglionFound, (peripheral) => {
//   // UNCOMMENT BELOW FOR DROPPED PACKET CALCULATIONS...
//   let droppedPacketCounter = 0;
//   let buf = [];
//   let sizeOfBuf = 0;
//   let droppedPacketFunc = () => {
//     buf.push(droppedPacketCounter);
//     sizeOfBuf++;
//     droppedPacketCounter = 0;
//     if (sizeOfBuf >= 60) {
//       let sum = 0;
//       for (let i = 0; i < buf.length; i++) {
//         sum += parseInt(buf[i], 10);
//       }
//       const percentDropped = sum / 6000 * 100;
//       console.log(`dropped packet rate: ${sum} - percent dropped: %${percentDropped.toFixed(2)}`);
//       buf.shift();
//     } else {
//       console.log(`time till average rate starts ${60 - sizeOfBuf}`);
//     }
//   };
//   let droppedPacketInterval = null;
//   ganglion.on('sample', (sample) => {
//     /** Work with sample */
//     if (sample.valid) {
//       console.log(sample.sampleNumber);
//       // UNCOMMENT BELOW FOR DROPPED PACKET CALCULATIONS...
//       if (DO_PACKET_CALCULATIONS) {
//         if (droppedPacketInterval === null) {
//           droppedPacketInterval = setInterval(droppedPacketFunc, 1000);
//         }
//       }
//     } else {
//       console.log('err');
//     }
//   });
//
//   ganglion.on('close', () => {
//     console.log('close event');
//   });
//
//   ganglion.on('droppedPacket', (data) => {
//     // console.log('droppedPacket', data);
//     if (DO_PACKET_CALCULATIONS) {
//       droppedPacketCounter++;
//     }
//   });
//
//   ganglion.on('message', (message) => {
//     console.log('message: ', message.toString());
//   });
//
//   let lastVal = 0;
//   ganglion.on('accelerometer', (accelData) => {
//     // Use accel array [0, 0, 0]
//     if (accelData[2] - lastVal > 1) {
//       console.log(`Diff: ${accelData[2] - lastVal}`);
//     }
//     lastVal = accelData[2];
//     // console.log(`counter: ${accelData[2]}`);
//   });
//
//   ganglion.on('impedance', (impedanceObj) => {
//     console.log(`channel ${impedanceObj.channelNumber} has impedance ${impedanceObj.impedanceValue}`);
//   });
//
//   ganglion.once('ready', () => {
//     // if (accel) {
//     //     ganglion.accelStart()
//     //         .then(() => {
//     //             return ganglion.streamStart();
//     //         })
//     //         .catch(errorFunc);
//     // } else if (impedance) {
//     //     ganglion.impedanceStart().catch(errorFunc);
//     // } else {
//     //
//     // }
//     console.log('ready');
//     setTimeout(() => {
//       console.log('start stream');
//       ganglion.streamStart().catch(errorFunc);
//     }, 2000);
//     // ganglion.disconnect(false)
//     //   .then(() => {
//     //     console.log('disconnected');
//     //   })
//     //   .catch((err) => {
//     //     console.log(err);
//     //   })
//   });
//   console.log("Date: ", Date.now());
//   ganglion.searchStop()
//     .then(() => {
//       console.log("Date: ", Date.now());
//       return ganglion.connect(peripheral.advertisementDataString);
//     }).catch(errorFunc);
// });

/***/

let syncingChanSettings = false;
let curTcpProtocol = kTcpProtocolBLE;

let ganglionHubError;
/**
 * The pointer to ganglion ble code
 * @type {Ganglion}
 */
let ganglionBLE = null;
let wifi = new Wifi({
  sendCounts,
  protocol: 'tcp',
  verbose: verbose,
  latency: 10000,
  debug: debug,
  burst: false
});
let cyton = new Cyton({
  sendCounts,
  verbose: verbose,
  debug: debug
});



process.on('uncaughtException',function(err){
  if (verbose) console.log('Err: ', err.message);
  dialog.showErrorBox("OpenBCIHub Fatal Error", err.message);
  if (mb) {
    if (verbose) console.log('Closing the app');
    mb.app.quit();
  }
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
    if (wifi) {
      if (wifi.isConnected()) {
        wifi.disconnect()
          .catch((err) => {
            if (verbose) console.log(err);
          })
      }
      if (wifi.isSearching()) {
        _scanStopWifi(null, false).catch(console.log);
      }
    }
    if (cyton.isConnected()) {
      if (cyton.isStreaming()) {
        cyton.streamStop()
          .then(() => {
            return cyton.disconnect();
          })
          .catch((err) => {
            if (verbose) console.log(err);
          })
      } else {
        cyton.disconnect()
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
 * @param sample.sampleNumber {number}
 * @param sample.channelDataCounts {Array} Array of counts, no gain.
 * @param sample.accelDataCounts {Array} Array of accel counts
 * @param sample.auxData {Buffer} - Buffer for sample
 * @param sample.auxData.lower {Buffer} - Buffer for daisy
 * @param sample.valid {Boolean} - If it is valid
 * @param sample.stopByte {Number} - The stop byte
 *  A sample object.
 */
var sampleFunction = (client, sample) => {
  let packet = `${kTcpCmdData},${kTcpCodeSuccessSampleData},`;
  if (!sample.valid && curTcpProtocol !== kTcpProtocolBLE) {
    client.write(`${kTcpCmdData},${kTcpCodeBadPacketData}${kTcpStop}`);
    return;
  }
  packet += sample.sampleNumber;
  if (sample.hasOwnProperty('channelDataCounts')) {
    for (var j = 0; j < sample.channelDataCounts.length; j++) {
      packet += ',';
      packet += sample.channelDataCounts[j];
    }
  }

  if (sample.hasOwnProperty('stopByte')) {
    packet += `,${sample.stopByte}`;

    if (sample.stopByte === 0xC0) {
      if (sample.hasOwnProperty('accelDataCounts')) {
        for (var j = 0; j < sample.accelDataCounts.length; j++) {
          packet += `,${sample.accelDataCounts[j]}`;
        }
      }
    } else {
      if (sample.hasOwnProperty('channelDataCounts') && sample.hasOwnProperty('auxData')) {
        if (sample.channelDataCounts.length === k.OBCINumberOfChannelsDaisy) {
          for (let i =0; i < sample.auxData.lower.byteLength; i++) {
            packet += `,${sample.auxData.lower[i]}`;
          }
        } else {
          for (let i =0; i < sample.auxData.byteLength; i++) {
            packet += `,${sample.auxData[i]}`;
          }
        }
      }
    }
  }


  packet += `${kTcpStop}`;
  // console.log(JSON.stringify(sample));
  // console.log(packet);
  if (!client.destroyed) client.write(packet);
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
 * @param impedanceObj.channelNumber {Number} - Channels 1, 2, 3, 4 or 0 for reference
 * @param impedanceObj.impedanceValue {Number} - The impedance value in ohms
 */
var impedanceFunction = (client, impedanceObj) => {
  const packet = `${kTcpCmdImpedance},${kTcpCodeSuccessImpedanceData},${impedanceObj.channelNumber},${impedanceObj.impedanceValue}${kTcpStop}`;
  client.write(packet);
};

var closeFunction = () => {
  if (verbose) console.log('close event fired');
};

const unrecognizedCommand = (client, cmd, msg) => {
  client.write(`${kTcpCmdError},${kTcpCodeErrorCommandNotRecognized},${msg}${kTcpStop}`);
};

const parseMessage = (msg, client) => {
  let msgElements = msg.toString().split(',');
  // var char = String.fromCharCode(msg[0])
  // console.log('msgElements[0]',msgElements[0],char)
  switch (msgElements[0]) {
    case kTcpCmdBoardType:
      processBoardType(msg, client);
      break;
    case kTcpCmdChannelSettings:
      processChannelSettings(msg, client);
      break;
    case kTcpCmdConnect:
      processConnect(msg, client);
      break;
    case kTcpCmdCommand:
      processCommand(msg, client);
      break;
    case kTcpCmdDisconnect:
      processDisconnect(msg, client);
      break;
    case kTcpCmdExamine:
      processExamine(msg, client);
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
    case kTcpCmdSd:
      processSd(msg, client);
      break;
    case kTcpCmdWifi:
      processWifi(msg, client);
      break;
    case kTcpCmdStatus:
      // A simple loop back
      client.write(`${kTcpCmdStatus},${kTcpCodeSuccess}${kTcpStop}`);
      break;
    case kTcpCmdError:
    default:
      unrecognizedCommand(client, kTcpCmdError, msgElements[0]);
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

const processBoardType = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const boardType = msgElements[1];
  if (curTcpProtocol === kTcpProtocolSerial) {
    if (cyton.getBoardType() === boardType) {
      if (verbose) console.log('board type was already set correct');
      client.write(`${kTcpCmdBoardType},${kTcpCodeSuccess},${boardType}${kTcpStop}`);
    } else {
      cyton.hardSetBoardType(boardType)
        .then(() => {
          if (verbose) console.log('set board type');
          client.write(`${kTcpCmdBoardType},${kTcpCodeSuccess},${boardType}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdBoardType},${kTcpCodeErrorUnableToSetBoardType},${err.message}${kTcpStop}`);
        });
    }
  } else if (curTcpProtocol === kTcpProtocolWiFi) {
    if (wifi.getBoardType() === boardType) {
      if (verbose) console.log('board type was already set correct');
      client.write(`${kTcpCmdBoardType},${kTcpCodeSuccess},${boardType}${kTcpStop}`);
    } else {
      if (verbose) console.log('wifi currently connected to set board type');
      let response = "";
      if (wifi.getBoardType() === 'none') {
        response = "WiFi Shield is not connected to any OpenBCI board";
      } else {
        response = `Wifi is currently attached to ${wifi.getBoardType()} which is not the same number of channels or board type as selected`;
      }
      client.write(`${kTcpCmdBoardType},${kTcpCodeErrorUnableToSetBoardType},${response}${kTcpStop}`);

    }
  } else {
    client.write(`${kTcpCmdBoardType},${kTcpCodeErrorUnableToSetBoardType},${`Set protocol first to Serial or WiFi, cur protocol is ${curTcpProtocol}`}${kTcpStop}`);
  }
};

const _syncChanSettingsStart = (client) => {
  if (syncingChanSettings) {
    client.write(`${kTcpCmdChannelSettings},${kTcpCodeErrorChannelSettingsSyncInProgress},${kTcpActionStart}${kTcpStop}`);
  } else {
    if (verbose) console.log('about to try and start register channel setting sync');
    syncingChanSettings = true;

    let funcer;
    if (curTcpProtocol === kTcpProtocolSerial) funcer = cyton.syncRegisterSettings.bind(cyton);
    else funcer = wifi.syncRegisterSettings.bind(wifi);

    try {
      funcer()
        .then((channelSettings) => {
          _.forEach(channelSettings,
            /**
             * @param cs {ChannelSettingsObject}
             */
            (cs) => {
              // console.log(`${kTcpCmdChannelSettings},${kTcpCodeSuccess},${cs.channelNumber},${cs.powerDown},${cs.gain},${cs.inputType},${cs.bias},${cs.srb2},${cs.srb1}${kTcpStop}`);
              client.write(`${kTcpCmdChannelSettings},${kTcpCodeSuccessChannelSetting},${cs.channelNumber},${cs.powerDown},${cs.gain},${cs.inputType},${cs.bias},${cs.srb2},${cs.srb1}${kTcpStop}`);
            });
          syncingChanSettings = false;
        })
        .catch((err) => {
          console.log("cyton serial aww err", err);
          // client.write(`${kTcpCmdChannelSettings},${kTcpCodeErrorChannelSettings},${err.message}${kTcpStop}`);
          syncingChanSettings = false;
        });
    } catch (e) {
      if (verbose) console.log(e);
    }
  }
}

/**
 * @typedef {Object} ChannelSettingsObject - See page 50 of the ads1299.pdf
 * @property {Number} channelNumber - The channel number of this object
 * @property {Boolean} powerDown - Power-down: - This boolean determines the channel power mode for the
 *                      corresponding channel. `false` for normal operation, channel is on, and `true` for channel
 *                      power-down, channel is off. (Default is `false`)
 * @property {Number} gain - PGA gain: This number determines the PGA gain setting. Can be either 1, 2, 4, 6, 8, 12, 24
 *                      (Default is 24)
 * @property {String} inputType - Channel input: This string is used to determine the channel input selection.
 *                      Can be:
 *                        'normal' - Normal electrode input (Default)
 *                        'shorted' - Input shorted (for offset or noise measurements)
 *                        'biasMethod' - Used in conjunction with BIAS_MEAS bit for BIAS measurements.
 *                        'mvdd' - MVDD for supply measurement
 *                        'temp' - Temperature sensor
 *                        'testsig' - Test signal
 *                        'biasDrp' - BIAS_DRP (positive electrode is the driver)
 *                        'biasDrn' - BIAS_DRN (negative electrode is the driver)
 * @property {Boolean} bias - BIAS: Is the channel included in the bias? If `true` or yes, this channel has both P
 *                      and N channels connected to the bias. (Default is `true`)
 * @property {Boolean} srb2 - SRB2 connection: This boolean determines the SRB2 connection for the corresponding
 *                      channel. `false` for open, not connected to channel, and `true` for closed, connected to the
 *                      channel. (Default is `true`)
 * @property {Boolean} srb1 - Stimulus, reference, and bias 1: This boolean connects the SRB2 to all 4, 6, or 8
 *                      channels inverting inputs. `false` when switches open, disconnected, and `true` when switches
 *                      closed, or connected. (Default is `false`)
 */
const processChannelSettings = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      _syncChanSettingsStart(client);
      break;
    case kTcpActionSet:
      try {
        const channelNumber = parseInt(msgElements[2]);
        const powerDown = Boolean(parseInt(msgElements[3]));
        const gain = parseInt(msgElements[4]);
        const inputType = msgElements[5];
        const bias = Boolean(parseInt(msgElements[6]));
        const srb2 = Boolean(parseInt(msgElements[7]));
        const srb1 = Boolean(parseInt(msgElements[8]));

        let funcer = null;
        if (curTcpProtocol === kTcpProtocolSerial) funcer = cyton.channelSet.bind(cyton);
        else funcer = wifi.channelSet.bind(wifi);

        funcer(channelNumber+1, powerDown, gain, inputType, bias, srb2, srb1)
          .then(() => {
            client.write(`${kTcpCmdChannelSettings},${kTcpCodeSuccess},${kTcpActionSet}${kTcpStop}`);
          })
          .catch((err) => {
            client.write(`${kTcpCmdChannelSettings},${kTcpCodeErrorChannelSettingsFailedToSetChannel},${err.message}${kTcpStop}`);
          });
      } catch (e) {
        client.write(`${kTcpCmdChannelSettings},${kTcpCodeErrorChannelSettingsFailedToParse},${e.message}${kTcpStop}`);
      }
      break;
  }
};

const _processCommandBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');

  if (_.isNull(ganglionBLE)) {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorProtocolNotStarted},${kTcpProtocolBLE}${kTcpStop}`);
  }
  if (ganglionBLE) {
    if (ganglionBLE.isConnected()) {
      ganglionBLE.write(msgElements[1])
        .then(() => {
          if (verbose) console.log(`sent ${msgElements[1]} to Ganglion`);
          client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
        })
        .catch((err) => {
          if (verbose) console.log('unable to write command', err);
          client.write(`${kTcpCmdCommand},${kTcpCodeErrorCommandNotAbleToBeSent},${err}${kTcpStop}`);
        });
    } else {
      client.write(`${kTcpCmdCommand},${kTcpCodeErrorNoOpenBleDevice}${kTcpStop}`);
    }
  } else {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorNoOpenBleDevice}${kTcpStop}`);
  }
};

const _processCommandSerial = (msg, client) => {
  if (_.isNull(cyton)) {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorProtocolNotStarted},${kTcpProtocolSerial}${kTcpStop}`);
  }
  let msgElements = msg.toString().split(',');
  cyton.write(msgElements[1])
    .then(() => {
      if (verbose) console.log(`sent ${msgElements[1]} to Cyton shield`);
      client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
    })
    .catch((err) => {
      if (verbose) console.log('serial unable to write command', err);
      client.write(`${kTcpCmdCommand},${kTcpCodeErrorCommandNotAbleToBeSent},${err}${kTcpStop}`);
    });
};

const _processCommandWifi = (msg, client) => {
  if (_.isNull(wifi)) {
    client.write(`${kTcpCmdCommand},${kTcpCodeErrorProtocolNotStarted},${kTcpProtocolWiFi}${kTcpStop}`);
  }
  let msgElements = msg.toString().split(',');
  wifi.write(msgElements[1])
    .then(() => {
      if (verbose) console.log(`sent ${msgElements[1]} to Wifi shield`);
      client.write(`${kTcpCmdCommand},${kTcpCodeSuccess}${kTcpStop}`);
    })
    .catch((err) => {
      if (verbose) console.log('wifi unable to write command', err);
      client.write(`${kTcpCmdCommand},${kTcpCodeErrorCommandNotAbleToBeSent},${err}${kTcpStop}`);
    });
};

const processCommand = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processCommandWifi(msg, client);
      break;
    case kTcpProtocolSerial:
      _processCommandSerial(msg, client);
      break;
    case kTcpProtocolBLE:
    case kTcpProtocolBLED112:
    default:
      _processCommandBLE(msg, client);
      break;
  }
};

const _processConnectBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');
  if (ganglionBLE) {
    if (ganglionBLE.isConnected()) {
      if (verbose) console.log('already connected');
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
    } else {
      if (verbose) console.log(`Attempting to connect to ${msgElements[1]}`);
      if (ganglionBLE.isSearching()) {
        if (curTcpProtocol === kTcpProtocolBLED112) {
          ganglionBLE.once('ready', () => {
            console.log('ready');

          });
          ganglionBLE.searchStop()
            .then(() => {
              console.log("Date: ", Date.now());
              return ganglionBLE.connect(msgElements[1]);
            }).catch((err) => {
              console.log(err);
            client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);

            ganglionBLE.removeAllListeners('ready');

          });
        } else {
          if (verbose) console.log('Driver is currently searching... going to stop');
          _scanStopBLE(client, false)
            .then(() => {
              _verifyDeviceBeforeConnect(msgElements[1], client);
              return Promise.resolve();
            })
            .catch((err) => {
              client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
              ganglionBLE.removeAllListeners('ready');
            });
        }
      } else {
        if (verbose) console.log("Ganglion is not searching but need to verify before connecting");
        if (curTcpProtocol === kTcpProtocolBLED112) {
          _connectGanglion(msgElements[1], client);
        } else {
          _verifyDeviceBeforeConnect(msgElements[1], client);
        }
      }
    }
  }
};

const _processConnectSerial = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const onReadyFunc = () => {
    if (verbose) console.log("ready");
    client.write(`${kTcpCmdConnect},${kTcpCodeSuccess},${cyton.getInfo().firmware}${kTcpStop}`);
    // cyton.on(k.OBCIEmitterRawDataPacket, console.log);
    cyton.on(k.OBCIEmitterSample, sampleFunction.bind(null, client));
    cyton.on(k.OBCIEmitterEot, messageFunction.bind(null, client));
    cyton.once(k.OBCIEmitterClose, closeFunction.bind(null, client));
  };
  if (cyton.isConnected()) {
    if (verbose) console.log('already connected');
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log("going to try and connect");
    let addr = msgElements[1];
    cyton.once(k.OBCIEmitterReady, onReadyFunc.bind(null, client));
    cyton.connect(addr)
      .then(() => {
        if (verbose) console.log("connect success");
      })
      .catch((err) => {
        client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
      })
  }
};

const _connectWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');

  if (verbose) console.log(`Connecting to WiFi Shield called ${msgElements[1]}`);
  let burst = false;
  let internetProtocol = kTcpInternetProtocolTCP;
  if (msgElements.length > 4) {
    if (msgElements[4] === kTcpInternetProtocolUDP) {
      internetProtocol = kTcpInternetProtocolUDP;
    } else if (msgElements[4] === kTcpInternetProtocolUDPBurst) {
      internetProtocol = kTcpInternetProtocolUDP;
      burst = true;
    }
  }
  wifi.connect({
      latency: parseInt(msgElements[3]),
      shieldName: msgElements[1],
      sampleRate: parseInt(msgElements[2]),
      protocol: internetProtocol,
      burst: burst
    })
    .then(() => {
      //TODO: Finish this connect
      if (verbose) console.log("connect success");
      client.write(`${kTcpCmdConnect},${kTcpCodeSuccess}${kTcpStop}`);
      // wifi.on(k.OBCIEmitterRawDataPacket, console.log);
      wifi.on('sample', sampleFunction.bind(null, client));
      wifi.on('message', messageFunction.bind(null, client));
      return Promise.resolve();
    })
    .catch((err) => {
      wifiRemoveListeners();
      if (verbose) console.log('connect wifi error:', err.message);
      if (err.message === 'ERROR: CODE: 404 MESSAGE: Route Not Found\r\n') {
        client.write(`${kTcpCmdConnect},${kTcpCodeErrorWifiNeedsUpdate},${err}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
      }
    })
};

const _processConnectWifi = (msg, client) => {
  if (wifi.isConnected()) {
    if (verbose) console.log('Already connected');
    client.write(`${kTcpCmdConnect},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log('Going to try and connect');
    if (wifi.isSearching()) {
      wifi.searchStop()
        .then(() => {
          if (verbose) console.log('Stopped search before connect');
          wifi.removeAllListeners(k.OBCIEmitterWifiShield);
          _connectWifi(msg, client);
          return Promise.resolve();
        })
        .catch((err) => {
        console.log("err", err);
          client.write(`${kTcpCmdConnect},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          return Promise.reject();
        });
    } else {
      wifi.removeAllListeners(k.OBCIEmitterWifiShield);
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
    case kTcpProtocolSerial:
      _processConnectSerial(msg, client);
      break;
    case kTcpProtocolBLE:
    case kTcpProtocolBLED112:
    default:
      _processConnectBLE(msg, client);
      break;
  }
};

const _verifyDeviceBeforeConnect = (peripheralName, client) => {
  let ganglionVerified = false;
  const verifyGanglionFound = (peripheral) => {
    let localName = '';
    if (curTcpProtocol === kTcpProtocolBLED112) {
      localName = peripheral.advertisementDataString;
    } else {
      localName = peripheral.advertisement.localName;
    }
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
  ganglionBLE.connect(peripheralName) // Port name is a serial port name, see `.listPorts()`
    .then(() => {
      if (verbose) console.log('able to send connect message');
    })
    .catch((err) => {
      client.write(`${kTcpCmdConnect},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
      console.log('failed to connect to ganglion with error: ', err);
      ganglionRemoveListeners();
    });
};

/**
 * For processing incoming disconnect commands with ganglion ble
 * @param client {Object} - writable TCP client
 */
const _processDisconnectBLE = (client) => {
  if (ganglionBLE) {
    ganglionBLE.manualDisconnect = true;
    ganglionBLE.disconnect(true)
      .then(() => {
        client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
        ganglionRemoveListeners();
      })
      .catch((err) => {
        client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
        ganglionRemoveListeners();
      });
  }
};

/**
 * For processing incoming disconnect commands with ganglion ble
 * @param client {Object} - writable TCP client
 */
const _processDisconnectSerial = (client) => {
  cyton.disconnect()
    .then(() => {
      if (verbose) console.log("disconnect resolved");
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
      cytonRemoveListeners();
    })
    .catch((err) => {
      if (verbose) console.log("failed to disconnect with err: ", err.message);
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err.message}${kTcpStop}`);
      cytonRemoveListeners();
    });
};

/**
 * For processing incoming disconnect commands with ganglion ble
 * @param client {Object} - writable TCP client
 */
const _processDisconnectWifi = (client) => {
  wifi.disconnect()
    .then(() => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeSuccess}${kTcpStop}`);
      wifiRemoveListeners();
    })
    .catch((err) => {
      client.write(`${kTcpCmdDisconnect},${kTcpCodeErrorUnableToDisconnect},${err}${kTcpStop}`);
      wifiRemoveListeners();
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
    case kTcpProtocolSerial:
      _processDisconnectSerial(client);
      break;
    case kTcpProtocolBLE:
    case kTcpProtocolBLED112:
    default:
      _processDisconnectBLE(client);
      break;
  }
};

const _examineWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');

  if (verbose) console.log(`Examining to WiFi Shield called ${msgElements[1]}`);

  wifi.connect({
    examineMode: true,
    shieldName: msgElements[1]
  })
    .then(() => {
      //TODO: Finish this connect
      if (verbose) console.log("connect for examine success");
      client.write(`${kTcpCmdExamine},${kTcpCodeSuccess}${kTcpStop}`);
      return Promise.resolve();
    })
    .catch((err) => {
      wifiRemoveListeners();
      console.log(err);
      client.write(`${kTcpCmdExamine},${kTcpCodeErrorUnableToConnect},${err}${kTcpStop}`);
    })
};

const processExamine = (msg, client) => {
  if (wifi.isConnected()) {
    if (verbose) console.log('Already connected');
    client.write(`${kTcpCmdExamine},${kTcpCodeErrorAlreadyConnected}${kTcpStop}`);
  } else {
    if (verbose) console.log('Going to try and connect');
    if (wifi.isSearching()) {
      wifi.searchStop()
        .then(() => {
          client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
          if (verbose) console.log('Stopped search before connect');
          wifi.removeAllListeners(k.OBCIEmitterWifiShield);
          _examineWifi(msg, client);
          return Promise.resolve();
        })
        .catch((err) => {
          console.log("err", err);
          client.write(`${kTcpCmdExamine},${kTcpCodeErrorScanCouldNotStop},${err}${kTcpStop}`);
          return Promise.reject();
        });
    } else {
      wifi.removeAllListeners(k.OBCIEmitterWifiShield);
      _examineWifi(msg, client);
    }
  }
};

const _processImpedanceCyton = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionSet:
      try {
        const channelNumber = parseInt(msgElements[2]);
        const pInputApplied = Boolean(parseInt(msgElements[3]));
        const nInputApplied = Boolean(parseInt(msgElements[4]));

        // console.log('channelNumber', channelNumber, 'pInputApplied', pInputApplied, 'nInputApplied', nInputApplied);

        let funcer = null;
        if (curTcpProtocol === kTcpProtocolSerial) funcer = cyton.impedanceSet.bind(cyton);
        else funcer = wifi.impedanceSet.bind(wifi);

        funcer(channelNumber, pInputApplied, nInputApplied)
          .then(() => {
            client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionSet}${kTcpStop}`);
          })
          .catch((err) => {
            client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceFailedToSetImpedance},${err.message}${kTcpStop}`);
          });
      } catch (e) {
        client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceFailedToParse},${e.message}${kTcpStop}`);
      }
      break;
  }
};

const _processImpedanceGanglion = (msg, client) => {
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

const _processImpedanceWifi = (msg, client) => {
  if (wifi.getNumberOfChannels() > k.OBCINumberOfChannelsGanglion) {
    _processImpedanceCyton(msg, client);
    return;
  }
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      wifi.impedanceStart()
        .then(() => {
          wifi.on(k.OBCIEmitterImpedance, impedanceFunction.bind(null, client));
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      wifi.impedanceStop()
        .then(() => {
          wifi.removeAllListeners(k.OBCIEmitterImpedance);
          client.write(`${kTcpCmdImpedance},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdImpedance},${kTcpCodeErrorImpedanceCouldNotStop},${err}${kTcpStop}`);
        });
      break;
  }
};

const processImpedance = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolSerial:
      _processImpedanceCyton(msg, client);
      break;
    case kTcpProtocolWiFi:
      _processImpedanceWifi(msg, client);
      break;
    case kTcpProtocolBLE:
    case kTcpProtocolBLED112:
      _processImpedanceGanglion(msg, client);
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
  if (cyton) {
    cytonSerialCleanup();
  }
};

const _protocolStartBLE = (protocol) => {
  return new Promise((resolve, reject) => {
    if (protocol === kTcpProtocolBLED112) {
      ganglionBLE = new Ganglion({
        sendCounts: true,
        verbose: verbose,
        debug: debug,
        bled112: true,
        nobleScanOnPowerOn: true
      }, (err) => {
        if (err) {
          if (verbose) console.log(`Error starting ganglion ble: ${err.message}`);
          // Need to send out error to clients when they connect that there is a bad inner noble
          ganglionHubError = err;
          reject(err);
        } else {
          resolve();
          if (verbose) console.log('Success starting ganglion bled112');
        }
      });
      curTcpProtocol = kTcpProtocolBLED112;
    } else {
      protocolSafeStart();

      const blePoweredUp = () => {
        if (verbose) console.log('Success with powering on bluetooth');
        resolve();
      };
      ganglionBLE = new Ganglion({
        nobleScanOnPowerOn: false,
        sendCounts: true,
        verbose: verbose,
        debug: debug,
        bled112: false
      }, (err) => {
        if (err) {
          if (verbose) console.log(`Error starting ganglion ble: ${err.message}`);
          // Need to send out error to clients when they connect that there is a bad inner noble
          ganglionHubError = err;
          reject(err);
          if (ganglionBLE) ganglionBLE.removeAllListeners(k.OBCIEmitterBlePoweredUp);
        } else {
          if (verbose) console.log('Success starting ganglion ble, waiting for BLE power up');
        }
      });
      ganglionBLE.once(k.OBCIEmitterBlePoweredUp, blePoweredUp);
      curTcpProtocol = kTcpProtocolBLE;
    }
  })
};

const _protocolStartSerial = () => {
  protocolSafeStart();

  if (_.isNull(cyton)) {
    cyton = new Cyton({
      sendCounts: true,
      hardSet: true,
      verbose: verbose
    });
  }
  curTcpProtocol = kTcpProtocolSerial;
  return Promise.resolve();
};

const _protocolStartWifi = () => {
  protocolSafeStart();
  if (_.isNull(wifi)) {
    wifi = new Wifi({
      sendCounts: true,
      verbose: verbose,
      debug: debug
    });
  }

  curTcpProtocol = kTcpProtocolWiFi;
  return Promise.resolve();
};
const _processProtocolBLE = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  const protocol = msgElements[2];
  curTcpProtocol = protocol;
  switch (action) {
    case kTcpActionStart:
      _protocolStartBLE(protocol)
        .then(() => {
          const ganglionFound = (peripheral) => {
            let localName = '';
            if (protocol === kTcpProtocolBLED112) {
              localName = peripheral.advertisementDataString;
            } else {
              localName = peripheral.advertisement.localName;
            }
            if (verbose) console.log(`Ganglion found: ${localName}`);
            client.write(`${kTcpCmdScan},${kTcpCodeSuccessGanglionFound},${localName}${kTcpStop}`);
          };
          ganglionBLE.on(k.OBCIEmitterGanglionFound, ganglionFound);
          ganglionBLE.once(k.OBCINobleEmitterScanStop, () => {
            ganglionBLE.removeAllListeners(k.OBCIEmitterGanglionFound);
            if (client) client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
          });
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolBLE},${kTcpActionStart}${kTcpStop}`);
          client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);

        })
        .catch((err) => {
          client.write(`${kTcpCmdProtocol},${kTcpCodeErrorProtocolBLEStart},${err}${kTcpStop}`);
        });
      break;
    case kTcpActionStatus:
      if (ganglionBLE) {
        client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolBLE},${kTcpActionStatus}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdProtocol},${kTcpCodeBadBLEStartUp},${kTcpProtocolBLE},${kTcpActionStatus}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      ganglionBLECleanup();
      client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolBLE},${kTcpActionStop}${kTcpStop}`);
      break;
  }
};

const _processProtocolSerial = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      _protocolStartSerial()
        .then(() => {
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolSerial},${kTcpActionStart}${kTcpStop}`);
        });
      break;
    case kTcpActionStatus:
      if (cyton) {
        client.write(`${kTcpCmdProtocol},${kTcpCodeStatusStarted}${kTcpStop}`);
      } else {
        client.write(`${kTcpCmdProtocol},${kTcpCodeStatusStopped}${kTcpStop}`);
      }
      break;
    case kTcpActionStop:
      cytonSerialCleanup();
      client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolSerial},${kTcpActionStop}${kTcpStop}`);
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
          client.write(`${kTcpCmdProtocol},${kTcpCodeSuccess},${kTcpProtocolWiFi},${kTcpActionStart}${kTcpStop}`);
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
    case kTcpProtocolBLED112:
      _processProtocolBLE(msg, client);
      break;
    case kTcpProtocolSerial:
      _processProtocolSerial(msg, client);
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
        if (verbose) console.log('stopped ble scan');
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
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoScanToStop}${kTcpStop}`);
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
  const scanStopped = () => {
    if (verbose) console.log('Scan stopped for Wifi shields');
    if (client) client.write(`${kTcpCmdScan},${kTcpCodeTimeoutScanStopped}${kTcpStop}`);
    wifiRemoveListeners();
  };
  return new Promise((resolve, reject) => {
    wifi.on(k.OBCIEmitterWifiShield, wifiFound);
    wifi.once('scanStopped', scanStopped);

    wifi.searchStart()
      .then(() => {
        client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        wifiRemoveListeners();
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStart},${kTcpProtocolWiFi},${err}${kTcpStop}`);
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
    wifiRemoveListeners();
    wifi.searchStop()
      .then(() => {
        if (writeOutMessage) client.write(`${kTcpCmdScan},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        resolve();
      })
      .catch((err) => {
        if (writeOutMessage) client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStop},${kTcpProtocolWiFi},${err}${kTcpStop}`);
        reject(err);
      });
  });
};
const _processScanSerialStart = (client) => {
  if (_.isNull(cyton)) {
    _protocolStartSerial().catch(console.log);
  }
  cyton.listPorts()
    .then((ports) => {
      /**
       * @param port {Object}
       * @param port.comName {String} - The serial port name.
       */
      _.forEach(ports, (port) => {
        const localName = port.comName;
        localArray.push(port);
        if (verbose) console.log(`Serial port device found: ${localName}`);
        client.write(`${kTcpCmdScan},${kTcpCodeSuccessSerialDeviceFound},${localName}${kTcpStop}`);
      });
    })
    .catch((err) => {
      client.write(`${kTcpCmdScan},${kTcpCodeErrorScanCouldNotStop},${kTcpProtocolSerial},${err.message}${kTcpStop}`);
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

const _processScanSerial = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      _processScanSerialStart();
      break;
    case kTcpActionStatus:
      client.write(`${kTcpCmdScan},${kTcpProtocolSerial},${kTcpCodeStatusNotScanning}${kTcpStop}`);
      break;
    case kTcpActionStop:
      client.write(`${kTcpCmdScan},${kTcpProtocolSerial},${kTcpCodeErrorScanNoScanToStop}${kTcpStop}`);
      break;
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
        client.write(`${kTcpCmdScan},${kTcpCodeErrorScanNoScanToStop}${kTcpStop}`);
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
    case kTcpProtocolSerial:
      _processScanSerial(msg, client);
      break;
    case kTcpProtocolBLE:
    default:
      _processScanBLE(msg, client);
      break;
  }
};

const _processSdSerial = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      cyton.sdStart(msgElements[2])
        .then(() => {
          client.write(`${kTcpCmdSd},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdSd},${kTcpCodeErrorUnknown},${kTcpActionStart},${err.message}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      cyton.sdStop()
        .then(() => {
          client.write(`${kTcpCmdSd},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdSd},${kTcpCodeErrorUnknown},${kTcpActionStop},${err.message}${kTcpStop}`);
        });
      break;
  }
};

const _processSdWifi = (msg, client) => {
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpActionStart:
      wifi.sdStart(msgElements[2])
        .then(() => {
          client.write(`${kTcpCmdSd},${kTcpCodeSuccess},${kTcpActionStart}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdSd},${kTcpCodeErrorUnknown},${kTcpActionStart},${err.message}${kTcpStop}`);
        });
      break;
    case kTcpActionStop:
      wifi.sdStop()
        .then(() => {
          client.write(`${kTcpCmdSd},${kTcpCodeSuccess},${kTcpActionStop}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdSd},${kTcpCodeErrorUnknown},${kTcpActionStop},${err.message}${kTcpStop}`);
        });
      break;
  }
};

/**
 * For processing incoming sd commands
 * @param msg {String} - The actual message. cmd,action,end
 * @param client {Object} - writable TCP client
 */
const processSd = (msg, client) => {
  switch (curTcpProtocol) {
    case kTcpProtocolWiFi:
      _processSdWifi(msg, client);
      break;
    case kTcpProtocolSerial:
      _processSdSerial(msg, client);
      break;
    case kTcpProtocolBLE:
      client.write(`${kTcpCmdSd},${kTcpCodeErrorSDNotSupportedForGanglion}${kTcpStop}`);
      break;
  }
};


/**
 * For processing incoming wifi commands
 * @param msg {String} - The actual message. cmd,action,end
 * @param client {Object} - writable TCP client
 */
const processWifi = (msg, client) => {
  if (_.isNull(wifi)) {
    client.write(`${kTcpCmdWifi},${kTcpCodeErrorWifiNotConnected}${kTcpStop}`);
    return;
  }
  let msgElements = msg.toString().split(',');
  const action = msgElements[1];
  switch (action) {
    case kTcpWifiEraseCredentials:
      wifi.eraseWifiCredentials()
        .then((res) => {
          client.write(`${kTcpCmdWifi},${kTcpCodeSuccess},${kTcpWifiEraseCredentials},${res}${kTcpStop}`);
        })
        .catch((err) => {
          client.write(`${kTcpCmdWifi},${kTcpCodeErrorWifiCouldNotEraseCredentials},${err.message}${kTcpStop}`);
        });
      break;
    case kTcpWifiGetFirmwareVersion:
      client.write(`${kTcpCmdWifi},${kTcpCodeSuccess},${kTcpWifiGetFirmwareVersion},${wifi.getFirmwareVersion()}${kTcpStop}`);
      break;
    case kTcpWifiGetIpAddress:
      client.write(`${kTcpCmdWifi},${kTcpCodeSuccess},${kTcpWifiGetIpAddress},${wifi.getIpAddress()}${kTcpStop}`);
      break;
    case kTcpWifiGetMacAddress:
      client.write(`${kTcpCmdWifi},${kTcpCodeSuccess},${kTcpWifiGetMacAddress},${wifi.getMacAddress()}${kTcpStop}`);
      break;
    case kTcpWifiGetTypeOfAttachedBoard:
      client.write(`${kTcpCmdWifi},${kTcpCodeSuccess},${kTcpWifiGetTypeOfAttachedBoard},${wifi.getBoardType()}${kTcpStop}`);
      break;
    default:
      client.write(`${kTcpCmdWifi},${kTcpCodeErrorWifiActionNotRecognized}${kTcpStop}`);
      break;
  }
};

const ganglionRemoveListeners = () => {
  if (ganglionBLE) {
    ganglionBLE.removeAllListeners('accelerometer');
    ganglionBLE.removeAllListeners('sample');
    ganglionBLE.removeAllListeners('message');
    ganglionBLE.removeAllListeners('impedance');
    ganglionBLE.removeAllListeners('ganglionFound');
    ganglionBLE.removeAllListeners('close');
  }
};

const ganglionBLECleanup = () => {
  if (ganglionBLE) {
    ganglionBLE.manualDisconnect = true;
    ganglionBLE.disconnect().catch(console.log);
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

const cytonRemoveListeners = () => {
  if (cyton) {
    cyton.removeAllListeners(k.OBCIEmitterClose);
    cyton.removeAllListeners(k.OBCIEmitterDroppedPacket);
    cyton.removeAllListeners(k.OBCIEmitterEot);
    cyton.removeAllListeners(k.OBCIEmitterImpedanceArray);
    cyton.removeAllListeners(k.OBCIEmitterRawDataPacket);
    cyton.removeAllListeners(k.OBCIEmitterReady);
    cyton.removeAllListeners(k.OBCIEmitterSample);
    cyton.removeAllListeners(k.OBCIEmitterSynced);
  }
};

const cytonSerialCleanup = () => {
  if (cyton) {
    cytonRemoveListeners();
    if (cyton.isConnected()) {
      cyton.disconnect().catch(console.log);
    }
  }
};

const wifiRemoveListeners = () => {
  wifi.removeAllListeners(k.OBCIEmitterWifiShield);
  wifi.removeAllListeners(k.OBCIEmitterSample);
  wifi.removeAllListeners(k.OBCIEmitterImpedance);
  wifi.removeAllListeners('scanStopped');
};

const wifiCleanup = () => {
  if (wifi) {
    wifiRemoveListeners();
    if (wifi.isSearching()) {
      _scanStopWifi(null, false).catch(console.log);
    }
    wifi.disconnect().catch(console.log);
    if (wifi.wifiClient) {
      wifi.wifiClient.stop();
    }
    wifi = null;
  }
};



function exitHandler (options, err) {
  if (options.cleanup) {
    if (verbose) console.log('clean');
  }
  if (err) console.log(err.stack);
  if (options.exit) {
    if (verbose) console.log('exit');
    ganglionBLECleanup();
    cytonSerialCleanup();
    wifiCleanup();
  }
}

let mb = menubar({
  icon: path.join(__dirname, 'resources', 'icons', 'icon.png'),
  width: 300,
  height: 400
});

mb.on('ready', function ready () {
  console.log('app is ready');
  // mb.tray.setImage()
  // your app code here
});

mb.on('after-close', function () {
  exitHandler.bind(null, {
    cleanup: true
  });
});
