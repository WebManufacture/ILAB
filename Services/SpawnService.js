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

var Services = useModule("ServicesManager");
var SpawnMon = useModule("spawnmon");
var forkMon = useModule("forkmon");

Frame.servicesPortsStart = 4995;

Frame._initFrame = function () {

    try {
        process.setMaxListeners(100);

        var wd = process.argv[2];

        var spawnMon = new SpawnMon({
            port: Frame.SocketPort,
            workPath : Frame.workingPath,
            saveHistory : true
        });
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
        });
        spawnMon.start();
        /*setInterval(function() {
         console.log(new Date());
         }, 5000);*/
    }
    catch (err) {
        console.error(err.stack);
    }
}

Frame._initFrame();