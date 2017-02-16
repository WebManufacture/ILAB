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
    console.log("Starting ILAB v 3.0.78");
	try {
		process.setMaxListeners(100);

		var wd = process.argv[2];

        var services = new ServicesManager(function () {
            return Frame._availablePort += 5;
        });
        services.on("error", function (err) {
            if (err.serviceId) {
                console.log("Service error: "  + err.serviceId);
            }
            console.error(err.stack);
            err.handled = true;
        });
        /*
		spawnMon.on("virtual-start", function (options) {
			console.log("Spawn service started with:");
			console.log(options);
		});
		spawnMon.on("virtual-stop", function (options) {
			console.log("Spawn service stopped.");
		});
		spawnMon.on("error", function (err) {
			console.error(err);
		});
		spawnMon.on("virtual-output", function (data) {
			console.log(data);
		});*/
					var allSection = [];
					for (var i = 2; i <= process.argv.length; i++){
						var arg = process.argv[i];
						if (!arg) continue;
						if (arg === "--config") {
							// используется config.json если третьим аргументом идёт флаг --config
							var configFile = require(Path.resolve("./config.json"));
							for (var key in configFile) {
                                allSection.push(services.StartService(key, configFile[key]));
							}
						}
						else{
                            allSection.push(services.StartService(arg));
						}
					}
			Promise.all(allSection).then(function() {
					console.log("All started!");
				}).catch(function(err) {
					if (err && !err.handled){
						console.error("Root error:")
						console.error(err);
					}
				});

		/*setInterval(function() {
		 console.log(new Date());
		 }, 5000);*/
	}
	catch (err) {
        console.log("RootError: ");
		console.error(err);
	}
};

Frame._initFrame();