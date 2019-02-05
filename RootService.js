var Path = require('path');
require(Path.resolve("./Frame.js"));
var os = require("os");

Frame.portsStart = 5600;
Frame._availablePort = Frame.portsStart;
Frame.serviceId = "ServicesManager";
Frame.servicePort = Frame.portsStart;
Frame.servicesManagerPort = Frame.servicePort;

function initRoot() {
    console.log("Starting ILAB v3.6.0");
	try {
		process.setMaxListeners(100);

		var servicesToStart = Frame.parseCmd();
		var debugMode = Frame.debugMode;
        var smConfig = servicesToStart['ServicesManager'];
        if (!smConfig) smConfig = servicesToStart['ServicesManager'] = {};
        if (debugMode) smConfig.debugMode = debugMode;
        if (smConfig.id) {
            Frame.serviceId = smConfig.id;
        }
        Frame.pipeId = os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + Frame.serviceId : '/tmp/' + Frame.serviceId;
        var ServicesManager = useRoot("System/ServicesManager");
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
        servicesManager.on("service-started", function (serviceId, port, config) {
            if (config){
                console.log("Service started: " + config.serviceType + "#" + serviceId + " on TCP " + port);
            } else {
                console.log("Service started: " + serviceId + " on TCP " + port);
            }
        })
        servicesManager.StartServices(services, params).then(function (result) {
            console.log("All started!");
        }).catch((err)=>{
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

initRoot();
