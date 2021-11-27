var Path = require('path');
var fs = require('fs');
var os = require("os");
const {app, Menu, BrowserWindow, ipcMain, Notification} = require('electron');
let mainWindow = null;
let mainWindowLoaded = false;
let mainWindowStarted = false;
let force_quit = false;
let closeInterval = null;
let rootServicePath = "RootService";

const isMac = process.platform === 'darwin';

// const template = []//just empty template for disable sys menu
//
// const menu = Menu.buildFromTemplate(template);
// Menu.setApplicationMenu(menu);

function createWindow () {
    // Create the browser window.
    mainWindow = win = new BrowserWindow({
      width: 1224,
      height: 740,
      frame: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        devTools: true,
      }
    });

     //win.removeMenu();

    // and load the index.html of the app.


    ipcMain.on("open-dev", ()=>{
        win.webContents.openDevTools();
    });

    ipcMain.on("maximize-message", function (event, data){
        win.maximize();
    });

    ipcMain.on("unmaximize-message", function (event, data){
        win.unmaximize();
    });

    ipcMain.on("minimize-message", function (event, data){
        win.minimize();
    });

    ipcMain.on("close-ready", function(){
        force_quit = true;
        console.log("Ready to close window");
    });

    mainWindow.on('close', function(e){
        console.log("Tryes to close window");
        mainWindow.removeMenu();
        if(!force_quit){
            e.preventDefault();
            console.log("Preventing close window, timer started");
            closeInterval = setTimeout(()=>{
              console.log("Close window timer...");
              force_quit = true;
              app.quit();
              process.exit();
            }, 100);
            sendMessage("closing");
        } else {
          console.log("Accepting close window");
        }
    });

    win.loadFile('start.html');
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
};

sendLog = (args)=>{
  _sendWithDelay("console", args);
};

sendMessage = (name, args)=>{
  if (mainWindow && mainWindowStarted){
    _send(name, args);
  }
};

var _oldLog = console.log;
console.log = function () {
    if (process.connected){
        const args = [];
        for (var i = 0; i < arguments.length; i++){
          args.push(arguments[i]);
        }
        sendLog(args);
    }

    _oldLog.apply(this, arguments);
};

var _oldLogError = console.error;
console.error = function () {
    if (process.connected){
        const args = [];
        for (var i = 0; i < arguments.length; i++){
          args.push(arguments[i]);
        }
        sendError(args);
    }
    _oldLogError.apply(this, arguments);
};

app.on('close', function (e) {
    console.log("Closing app...");
});

// You can use 'before-quit' instead of (or with) the close event
app.on('before-quit', function (e) {
    console.log("Before quit app...");
});

app.on('window-all-closed', function(e) {
    console.log("Window closed...");
    app.quit();
    process.exit();
});

ipcMain.on('critical-error', (event, args) => {
  _oldLog(args);
});

ipcMain.on("dom-ready", ()=>{
  rootService = require(rootServicePath);
  mainWindowLoaded = true;
});

ipcMain.on("started", ()=>{
    mainWindowStarted = true;
    console.log("Main window started");
    if (ilabStarted){
        sendMessage("services-started");
    }
});

var ilabStarted = false;

process.once("ilab-started", () => {
  ilabStarted = true;
  sendLog("services-started");
  sendMessage("services-started");
});


app.on('ready',() => {
  var pipeName = os.type() == "Windows_NT" ? '\\\\?\\pipe\\ServicesManager' : '/tmp/ilab-3-ServicesManager';

  if (fs.existsSync(pipeName)){
    const notification = {
       title: 'ILab App',
       body: 'Other ILab application already working.'
     }
     new Notification(notification).show();
    process.exit();
    return;
  }

  if (process.argv.length < 2){
      console.log("product mode");
    process.argv.push("");
    process.argv.push("--config=electron-config.json");
    process.chdir(Path.resolve(".."));
  } else {
    process.chdir(Path.resolve(".."));
    console.log("Developer mode: ", process.cwd());
  }
  rootServicePath = Path.resolve(rootServicePath);
  createWindow();
});
