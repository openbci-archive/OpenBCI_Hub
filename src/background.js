// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.
// import { app, BrowserWindow, Menu } from 'electron';
// import { devMenuTemplate } from './menu/dev_menu_template';
// import { editMenuTemplate } from './menu/edit_menu_template';
// import createWindow from './helpers/window';
//
// // Special module holding environment variables which you declared
// // in config/env_xxx.json file.
// import env from './env';
//
// var setApplicationMenu = () => {
//   var menus = [editMenuTemplate];
//   // if (env.name !== 'production') {
//   menus.push(devMenuTemplate);
//   // }
//   Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
// };
//
// // Save userData in separate folders for each environment.
// // Thanks to this you can use production and development versions of the app
// // on same machine like those are two separate apps.
// if (env.name !== 'production') {
//   var userDataPath = app.getPath('userData');
//   app.setPath('userData', userDataPath + ' (' + env.name + ')');
// }
//
// app.on('ready', () => {
//   let mainWindow;
//   if (env.name === 'development') {
//     setApplicationMenu();
//     mainWindow = createWindow('main', {
//       width: 1000,
//       height: 600
//     });
//     mainWindow.loadURL('file://' + __dirname + '/app.development.html');
//     mainWindow.openDevTools();
//   } else {
//     mainWindow = new BrowserWindow('main', {
//       width: 0,
//       height: 0
//     });
//     mainWindow.loadURL('file://' + __dirname + '/app.production.html');
//   }
// });
//
// app.on('window-all-closed', function () {
//   app.quit();
// });

import menubar from 'menubar';

let mb = menubar();

mb.on('ready', function ready () {
  console.log('app is ready');
  // your app code here
});