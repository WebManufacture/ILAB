var Path = require('path');
var fs = require('fs');
var os = require("os");
const {app, BrowserWindow} = require('electron');
process.chdir(Path.resolve('..'));
require(Path.resolve("Frame.js"));

Frame.portsStart = 5600;
Frame._availablePort = Frame.portsStart;
Frame.serviceId = "ServicesManager";
Frame.servicePort = Frame.portsStart;

var ServicesManager = useRoot("System/ServicesManager");

Frame._initFrame = function () {
    console.log("Starting ILAB v3.5.3");
    try {
        process.setMaxListeners(100);

        var wd = process.argv[2];

        var servicesToStart = {};
        if (fs.existsSync(Path.resolve("config.json"))) {
            var configFile = require(Path.resolve("config.json"));
            for (var key in configFile) {
                servicesToStart[key] = configFile[key];
            }
        }
        let debugMode = false;
        if (process.execArgv[0] && process.execArgv[0].indexOf("--inspect") >= 0){
            debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
        };
        let smConfig = servicesToStart['ServicesManager'];
        if (!smConfig) smConfig = servicesToStart['ServicesManager'] = {};
        if (debugMode) smConfig.debugMode = debugMode;
        var servicesManager = new ServicesManager(smConfig, function () {
            return Frame._availablePort += 5;
        });
        servicesManager.on("error", function (err) {
            if (err.serviceId) {
                console.log("Service error: "  + err.serviceId);
            }
            console.error(err);
            err.handled = true;
        });
        console.log("ServicesManager started on " + Frame.servicePort);
        console.log(servicesManager.id);
        delete servicesToStart['ServicesManager'];
        const services = Object.keys(servicesToStart);
        const params = [];
        services.forEach(sid => params.push(servicesToStart[sid]));
        servicesManager.StartServices(services, params).catch((err)=>{
            console.error(err);
        });
        /*
                var allSection = [];
                for (var key in servicesToStart){
                    allSection.push(services.StartService(key, servicesToStart[key]));
                }
                Promise.all(allSection).then(function() {
                        console.log("All started!");
                    }).catch(function(err) {
                        if (err && !err.handled){
                            console.error("Root error:");
                            console.error(err);
                        }
                    });*/
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
    }
};

function createWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 800, height: 600})

    // and load the index.html of the app.
    win.loadFile('../../../klab/fs.html');
}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
    app.quit();
    process.exit();
});

Frame._initFrame();