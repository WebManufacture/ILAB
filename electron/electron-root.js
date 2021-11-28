const {app, Menu, BrowserWindow, Notification, ipcMain} = require('electron');
var Path = require('path');
var fs = require('fs');
var os = require("os");

let mainWindow = null;
let mainWindowLoaded = false;
let mainWindowStarted = false;
let force_quit = false;
let closeInterval = null;

const isMac = process.platform === 'darwin';

// const template = []//just empty template for disable sys menu
//
// const menu = Menu.buildFromTemplate(template);
// Menu.setApplicationMenu(menu);

function createWindow(htmlPage) {
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
        //require('devtron').install();
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

    if (startConfig.lazyClose) {
        ipcMain.on("close-ready", function(){
            force_quit = true;
            console.log("Ready to close window");
        });

        mainWindow.on('close', function (e) {
            console.log("Tryes to close window");
            mainWindow.removeMenu();
            if (!force_quit) {
                e.preventDefault();
                console.log("Preventing close window, timer started");
                closeInterval = setTimeout(()=> {
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
    } else {
        mainWindow.on('close', function (e) {
            process.exit();
            app.quit();
        });
    }

    win.loadFile(htmlPage);
}

var logDept = [];
var _logSendingTimeout = null;

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

_send = (name, args)=>{
  try{
    mainWindow.webContents.send(name, JSON.stringify(args));
  } catch(e){
    console.error(e);
  }
};

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

let rootService = null;
let ilabStarted = false;
let startConfig = {
    debugMode: false,
    pageToStart: "start.html",
    waitDom: false,
    lazyClose: false
};

if (startConfig.lazyClose) {
    // You can use 'before-quit' instead of (or with) the close event
    app.on('before-quit', function (e) {
        console.log("Before quit app...");
    });

    app.on('window-all-closed', function (e) {
        console.log("Window closed...");
        process.exit();
        app.quit();
    });
} else {
    app.on('close', function (e) {
        console.log("Closing app...");
        process.exit();
        app.quit();
    });
}

ipcMain.on('critical-error', (event, args) => {
    _oldLog(args);
    app.quit();
    process.exit();
});

ipcMain.on("dom-ready", () => {
    if (startConfig.waitDom && startConfig.rootServicePath){
        console.log("Starting root: ", startConfig.rootServicePath);
        rootService = require(startConfig.rootServicePath);
    }
    console.log("Main window loaded");
    mainWindowLoaded = true;
});

ipcMain.on("started", ()=>{
    mainWindowStarted = true;
    console.log("Main window started");
    sendMessage("start-config", startConfig);
    if (ilabStarted){
        sendMessage("services-started");
    }
});

process.once("ilab-started", () => {
  ilabStarted = true;
  sendLog("services-started");
  sendMessage("services-started");
});

process.on("error", (err) => {
    const notification = {
        title: 'ILab Error',
        body: err.message
    }
    const notify = new Notification(notification).show();
})

function checkAndStoreArg(arg, key, configParamName){
    if (!configParamName) configParamName = key;
    if (arg.indexOf("--" + key) === 0) {
        if (arg.indexOf("=") > 0) {
            startConfig[configParamName] = arg.split("=")[1];
        } else {
            if (!startConfig.hasOwnProperty(configParamName)) {
                startConfig[configParamName] = true;
            }
        }
        console.log("Arg: ",arg);
        return true;
    }
    return false;
}

function parseConfigFile(fileName){
    try{
        var configFile = require(Path.resolve(fileName));
        if (typeof configFile == "object") {
            for (var key in configFile) {
                if (!startConfig.hasOwnProperty(key)) startConfig[key] = configFile[key];
            }
        }
    } catch (error) {
        console.error("Parsing config file error", error);
    }
}

function parseCommandArguments () {
    try{
        for (var i = 2; i <= process.argv.length; i++) {
            var arg = process.argv[i];
            if (!arg) continue;

            if (arg.indexOf("--inspect") >= 0 || arg.indexOf("--debug") >= 0 ) {
                startConfig.debugMode = arg.indexOf("--inspect-brk") >= 0 || arg.indexOf("--debug") >= 0 ? "debug" : "inspect";
                console.log("Debug mode: " + startConfig.debugMode);
                continue;
            }
            if (arg === "--new") {
                startConfig.useNewStart = true;
                continue;
            }
            if (checkAndStoreArg(arg, "page", "pageToStart")) {
                continue;
            }
            if (checkAndStoreArg(arg, "script", "scriptToStart")) {
                continue;
            }
            if (checkAndStoreArg(arg, "waitDom", "waitDom")) {
                continue;
            }
            if (checkAndStoreArg(arg, "lazyClose", "lazyClose")) {
                continue;
            }
            if (checkAndStoreArg(arg, "port")) {
                continue;
            }
            if (checkAndStoreArg(arg, "rootService", "rootServicePath")) {
                continue;
            }
            if (checkAndStoreArg(arg, "ilab", "ilab")) {
                if (!startConfig.rootServicePath) {
                    startConfig.rootServicePath = "RootService.js";
                }
                continue;
            }
            if (checkAndStoreArg(arg, "config", "configFileName")) {
                // используется config.json если аргументом идёт флаг --config (а не --config=someconfig.json)
                if (startConfig.configFileName === true) startConfig.configFileName = "config.json";
                // если уже используется конфиг -- то однозначно нужен ILab и rootService
                console.log("Using config: ", startConfig.configFileName);
                if (!startConfig.rootServicePath) {
                    startConfig.rootServicePath = "RootService.js";
                }
                parseConfigFile(startConfig.configFileName);
                continue;
            }
            if (arg.indexOf(".htm") >= 0 || arg.indexOf(".htm") >= 0) {
                startConfig.pageToStart = arg;
            }
        }
        return startConfig;
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
        return startConfig;
    }
};

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
        startConfig.startMode = "product";
        console.log("Product mode: ", process.cwd());
        process.argv.push("");
        process.argv.push("--config=config.json");
        //process.chdir(Path.resolve("./resources/"));
    } else {
        startConfig.startMode = "develop";
        //process.chdir(Path.resolve(".."));
        console.log("Developer mode: ", process.cwd());
    }

    parseCommandArguments();

    if (!startConfig.waitDom && startConfig.rootServicePath){
        console.log("Starting root without dom: ", startConfig.rootServicePath);
        rootService = require(Path.resolve(startConfig.rootServicePath));
    }
    if (startConfig.pageToStart) {
        createWindow(startConfig.pageToStart);
    } else {

    }
});
