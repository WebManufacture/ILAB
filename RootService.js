var Path = require('path');
var os = require("os");

if (!global.Frame){
    require(Path.resolve("./Frame.js"));
}

function initRoot() {
    console.log("Starting ILAB v3.6.0");
	try {
		var servicesToStart = Frame._parseCmd();
		var debugMode = Frame.debugMode;

        var smConfig = servicesToStart.find(s => s.type == 'ServicesManager');
        if (!smConfig) {
            smConfig = {
                type: "ServicesManager",
                id: Frame.newId(),
                path: "ServicesManager.js"
            }
        } else {
            if (!smConfig.path){
                smConfig.path = "ServicesManager.js";
            }
        };
        if (debugMode) smConfig.debugMode = debugMode;
        Frame.pipeId = Frame.getPipe(smConfig.id);
        var incrementalPort = Frame.portRanges && typeof Frame.portRanges[0] == 'number' ? Frame.portRanges[0] : 5600;
        var currentPortIndex = 0;
        var currentRangeIndex = 0;
        var ServicesManager = useService(smConfig.path);
        if (ServicesManager) {
            var servicesManager = new ServicesManager(smConfig, function () {
                /*if (Frame.portRanges){

                }*/
                return incrementalPort += 5;
            });
            servicesManager.on("error", function (err) {
                if (err.serviceId) {
                    console.log("Service error: " + err.serviceId);
                }
                console.error(err);
                err.handled = true;
            });
            console.log(servicesManager.serviceId + ": ServicesManager started on " + incrementalPort);
            const params = [];
            servicesToStart.forEach((service) => {
                if (!service.type) return;
                if (service.type == 'ServicesManager') return;
                if (service.type == 'RootService') return;
                params.push(service);
            });
            servicesManager.on("service-started", function (serviceId, port, config) {
                if (config) {
                    console.log("Service started: " + config.serviceType + "#" + serviceId + " on TCP " + port);
                } else {
                    console.log("Service started: " + serviceId + " on TCP " + port);
                }
            })
            servicesManager.StartServices(params).then(function (result) {
                console.log("All started!");
            }).catch((err) => {
                console.error(err);
            });
        }
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

if (!global.Frame){
    initRoot();
} else {
    module.exports = initRoot;
}


