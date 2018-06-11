var Path = require('path');
var fs = require('fs');
var os = require("os");
require(Path.resolve("./Frame.js"));

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

        let debugMode = false;
        var servicesToStart = {};
        if (process.execArgv[0] && process.execArgv[0].indexOf("--inspect") >= 0){
            debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
            console.log("Debug mode: " + debugMode);
        }
        for (var i = 2; i <= process.argv.length; i++){
            var arg = process.argv[i];
            if (!arg) continue;
            if (arg.indexOf("--inspect") >= 0){
                debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                console.log("Debug mode: " + debugMode);
                continue;
            }
            if (arg === "--config") {
                // используется config.json если третьим аргументом идёт флаг --config
                if (fs.existsSync(Path.resolve("config.json"))) {
                    var configFile = require(Path.resolve("config.json"));
                    for (var key in configFile) {
                        servicesToStart[key] = configFile[key];
                    }
                }
                continue;
            }
            if (arg === "--demo") {
                // используется config.json если третьим аргументом идёт флаг --config
                if (fs.existsSync(Path.resolve("config-sample.json"))) {
                    var configFile = require(Path.resolve("config-sample.json"));
                    for (var key in configFile) {
                        servicesToStart[key] = configFile[key];
                    }
                }
                continue;
            }
            if (arg.indexOf("--port") >= 0){
                Frame.servicePort = Frame._availablePort = Frame.portsStart = parseInt(arg.split("=")[1]);
                continue;
            }
            if (arg.indexOf("{") == 0){
                try{
                    var service = eval("(function(){ return " + arg + "; })()");
                    if (service.type || service.path || service.id){
                        servicesToStart[service.type || service.path || service.id] = service;
                    }
                }
                catch (err){
                    console.error(err);
                }
                continue;
            }
            if (arg.indexOf(".js") < 0){
                servicesToStart[arg] = {
                    path: arg = "Services/" + arg + ".js"
                }
            } else {
                servicesToStart[arg] = null;
            }
        }

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
        console.log(servicesManager.serviceId);
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

Frame._initFrame();