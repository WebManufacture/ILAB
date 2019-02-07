var Path = require('path');
var os = require("os");

function _init() {
    useModule('utils.js');
    var ForkingService = useSystem('ForkingService');
    //var service = useSystem('Service');


    function _parseCmd () {
        var debugMode = false;
        var servicesToStart = [];
        function findServiceIndex(selectorObj) {
            if (selectorObj.id){
                return servicesToStart.indexOf(s => s.id == selectorObj.id);
            }
            if (selectorObj.path){
                return servicesToStart.indexOf(s => s.path == selectorObj.path);
            }
            return servicesToStart.indexOf(s => s.type == selectorObj.type);
        }
        function copyConfig(to, from, replace){
            if (to && from){
                for (var item in from){
                    if (from.hasOwnProperty(item) && (to[item] === undefined || replace)){
                        to[item] = from[item];
                    }
                }
            }
        }
        function parseConfig(config, key) {
            if (!config) return null;
            if (!config.type){
                config.type = key;
            }
            if (config.id) {
                if (config.id == "auto") {
                    config.id = Frame.newId();
                }
            } else {
                if (key) {
                    config.id = key;
                }
                else {
                    config.id = Frame.newId();
                }
            }
            if (!config.path){
                config.path = config.type;
            }
            return config;
        }
        function mergeConfig(config) {
            var index = findServiceIndex(config);
            if (index >= 0){
                copyConfig(servicesToStart[index], config, true);
            } else {
                servicesToStart.push(config);
            }
            return config;
        }
        try{
            if (process.execArgv[0] && (process.execArgv[0].indexOf("--inspect") >= 0 || process.execArgv[0].indexOf("--debug") >= 0)){
                debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                console.log("Debug mode: " + debugMode);
            }
            var configFileName = "config.json";
            for (var i = 2; i <= process.argv.length; i++) {
                var arg = process.argv[i];
                if (!arg) continue;
                if (arg.indexOf("--inspect") >= 0) {
                    debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                    console.log("Debug mode: " + debugMode);
                    continue;
                }
                if (arg === "--basic") {
                    servicesToStart.push({
                        type: "FilesService",
                        id: "auto"
                    });
                    servicesToStart.push({
                        type: "ConfigService",
                        id: "auto"
                    });
                    servicesToStart.push({
                        type: "ServicesManager",
                        id: "auto"
                    });
                }
                if (arg === "--demo") {
                    configFileName = "config-sample.json";
                }
                if (arg === "--demo" || arg.indexOf("--config") === 0) {
                    // используется config.json если аргументом идёт флаг --config
                    if (arg.indexOf("=") > 0) {
                        configFileName = arg.split("=")[1];
                    }
                    try{
                        var configFile = require(Path.resolve(configFileName));
                        if (Array.isArray(configFile)){
                            configFile.forEach((config)=>{
                                config = parseConfig(config, key);
                                if (config){
                                    mergeConfig(config);
                                }
                            });
                        } else {
                            if (typeof configFile == "object") {
                                for (var key in configFile) {
                                    if (key == "id"){
                                        if (configFile.id && configFile.id.length != 'auto') //Frame.serviceId = configFile.id;
                                            continue;
                                    }
                                    if (key == "port"){
                                        Frame.portRanges.push(configFile.port);
                                        continue;
                                    }
                                    if (key == "ports"){
                                        Frame.portRanges = Frame.portRanges.concat(configFile.ports);
                                        continue;
                                    }
                                    var config = parseConfig(configFile[key], key);
                                    if (config){
                                        mergeConfig(config);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        Frame.error(error);
                    }
                    continue;
                }
                if (arg.indexOf("{") == 0) {
                    try {
                        var service = eval("(function(){ return " + arg + "; })()");
                        if (service.type || service.path || service.id) {
                            mergeConfig(service);
                        }
                    } catch (err) {
                        console.error(err);
                    }
                    continue;
                }
                if (arg.indexOf(".js") < 0) {
                    mergeConfig(parseConfig({
                        path: "Services/" + arg + ".js"
                    }));
                } else {
                    mergeConfig(parseConfig({
                        path: arg
                    }));
                }
            }
            Frame.debugMode = debugMode;
            // console.log('Frame: servicesToStart ', servicesToStart)
            return servicesToStart;
        }
        catch (err) {
            console.log("RootError: ");
            console.error(err);
            return servicesToStart;
        }
    };

    global.RootService = function RootService() {
        console.log("RootService for ILAB v4.0");
        try {
            var servicesToStart = _parseCmd();
            var result = ForkingService.call(this, { id: Frame.serviceId });
            var debugMode = Frame.debugMode;
            Frame.pipeId = Frame.getPipe(Frame.serviceId);

            this.on("error", function (err) {
                if (err.serviceId) {
                    console.log("Service error: " + err.serviceId);
                }
                console.error(err);
                err.handled = true;
            });
            this.on("child-started", function (serviceId, port, config) {
                if (config) {
                    console.log("Service started: " + config.serviceType + "#" + serviceId + " on TCP " + port);
                } else {
                    console.log("Service started: " + serviceId + " on TCP " + port);
                }
            });
            Frame.startChild(servicesToStart).then(function (result) {
                console.log("All started!");
            }).catch((err) => {
                console.error(err);
            });

        } catch (err) {
            console.log("RootError: ");
            console.error(err);
        }
    };

    Inherit(RootService, ForkingService, {

    });
}

if (!global.Frame){
    Frame = { isChild: false }
    require(Path.resolve("./Frame.js"));
    _init();
    Frame._startFrame(RootService);
} else {
    _init();
    module.exports = RootService;
}


