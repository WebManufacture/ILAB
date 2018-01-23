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
    console.log("Starting ILAB v 3.4.11");
	try {
		process.setMaxListeners(100);

		var wd = process.argv[2];

        var servicesToStart = {};
        for (var i = 2; i <= process.argv.length; i++){
            var arg = process.argv[i];
            if (!arg) continue;
            if (arg === "--config") {
                // используется config.json если третьим аргументом идёт флаг --config
                var configFile = require(Path.resolve("./config.json"));
                for (var key in configFile) {
                    servicesToStart[key] = configFile[key];
                }
            }
            else{
                servicesToStart[arg] = null;
            }
        }

        var services = new ServicesManager(servicesToStart['ServicesManager'], function () {
            return Frame._availablePort += 5;
        });
        services.on("error", function (err) {
            if (err.serviceId) {
                console.log("Service error: "  + err.serviceId);
            }
            console.error(err);
            err.handled = true;
        });
        var keys = [];
        for (var key in servicesToStart){
            keys.push(key);
        }
        var index = 0;
        var promise = null;

        function onStarted() {
            var key = keys[index];
            if (key){
                promise = services.StartService(key, servicesToStart[key]).then(onStarted).catch((error)=>{
                    onStarted();
                });
            }
            index++;
        }

        onStarted();
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