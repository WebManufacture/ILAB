var Path = require('path');
var fs = require('fs');
var os = require("os");

Frame = {};

Frame = { isChild : false };

Frame.ilabPath = Frame.basePath = Path.dirname(process.argv[1]);
Frame.workingPath = typeof(process.argv[2]) == 'string' ? Path.resolve(process.argv[2]) : process.cwd();

Frame.NodesPath =  Frame.ilabPath + "/Nodes/";
Frame.ModulesPath = Frame.ilabPath + "/Modules/";
Frame.ServicesPath = Frame.ilabPath + "/Services/";
Frame.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";
Frame.Nodes = {};
Frame.Modules = [];
Frame.Services = {};

global.useModule = Frame.useModule = function(path){
	if (path.indexOf(".js") != path.length - 3){
		path += ".js";
	}
	return require(Path.resolve(Frame.ModulesPath + path));
};

global.useService = Frame.useService = function(path){
	if (path.indexOf(".js") != path.length - 3){
		path += ".js";
	}
	return require(Path.resolve(Frame.ServicesPath + path));
};

global.useSystem = Frame.useSystem = function(path){
    return require(path);
	//return require(Path.resolve(Frame.NodeModulesPath + path));
};

var ServicesManager = useService("ServicesManager");

Frame.getPort = function () {
	return Frame._availablePort++;
};

Frame.portsStart = 4995;
Frame._availablePort = Frame.portsStart;

Frame._initFrame = function () {
    console.log("Starting ILAB v 3.0.78");
	try {
		process.setMaxListeners(100);

		var wd = process.argv[2];

		Frame.servicesManagerPort = Frame.getPort();
		var services = new ServicesManager(Frame.servicesManagerPort);
        services.on("error", function (err) {
            if (err.serviceId) {
                console.log("Service error: "  + err.serviceId);
            }
            console.error(err);
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
        //services.startService("LoggerService");
		services.startService("NodesManagerService", function () {
            var nodesManager = new ServiceProxy();
            nodesManager.on("error", function(err){
                console.log(err)
            });
            nodesManager.attach(services.services["NodesManagerService"].port, "localhost", function(){
                nodesManager.StartNode("./Nodes/ServicesHttpProxy");
            });
		});

		
		/*setInterval(function() {
		 console.log(new Date());
		 }, 5000);*/
	}
	catch (err) {
        console.log("RootError: ");
		console.error(err.stack);
	}
}

Frame._initFrame();