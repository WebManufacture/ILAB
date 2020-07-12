var Path = require('path');
var fs = require('fs');
var os = require("os");
const {app, BrowserWindow, ipcMain} = require('electron');
//process.chdir(Path.resolve('..'));

let mainWindow = null;
let mainWindowLoaded = false;
let mainWindowStarted = false;

function createWindow () {
    // Create the browser window.
    mainWindow = win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
      }
    })

    win.loadFile('start.html');
    // and load the index.html of the app.
    let contents = win.webContents;
    contents.on("dom-ready", ()=>{
      mainWindowLoaded = true;
    });
    //contents.openDevTools();
    ipcMain.on("started", ()=>{
      mainWindowStarted = true;
      console.log("Main window started");
    });
}

_errorHandler = function(err){
    if (process.connected){
        if (typeof (err) == "object") {
            process.send({type: "error", message: err.message, item: err.stack});
        } else {
            process.send({type: "error", message: err, item: null});
        }
    }
    console.error(err);
};

var logDept = [];
var _logSendingTimeout = null;

var _send = (name, args)=>{
  try{
    mainWindow.webContents.send(name, JSON.stringify(args));
  } catch(e){
    console.error(e);
  }
}

_sendWithDelay = (name, args)=>{
  if (mainWindow && mainWindowLoaded){
    _send(name, args);
  } else {
    logDept.push(args);
    if (!_logSendingTimeout){
      _logSendingTimeout = setInterval(()=>{
        if (mainWindow && mainWindowLoaded){
          clearInterval(_logSendingTimeout);
          logDept.forEach(item => {
              _send(name, item);
          });
        }
      }, 100);
    }
  }
}

sendError = (args)=>{
  _sendWithDelay("server-error", args);
}

sendLog = (args)=>{
  _sendWithDelay("console", args);
}

sendMessage = (name, args)=>{
  if (mainWindow && mainWindowStarted){
    _send(name, args);
  }
}

var _oldLog = console.log;
console.log = function () {
    const args = [];
    for (var i = 0; i < arguments.length; i++){
      args.push(arguments[i]);
    }
    sendLog(args);
    _oldLog.apply(this, arguments);
};

var _oldLogError = console.error;
console.error = function () {
    const args = [];
    for (var i = 0; i < arguments.length; i++){
      args.push(arguments[i]);
    }
    sendError(args);
    _oldLogError.apply(this, arguments);
};

function connectService(service){

}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
    app.quit();
    process.exit();
});

ipcMain.on('critical-error', (event, args) => {
  _oldLog(args);
})

if (process.argv.length < 2){
  process.argv.push("");
  process.argv.push("--config=electron-config.json");
} else {
  process.argv.push("--config=electron-config.json");
}

process.once("ilab-started", () => {
  sendLog("services-started");
  sendMessage("services-started");
});

const rootService = require(Path.resolve("RootService.js"));
