var Path = require('path');
var os = require("os");

function _init() {
    useModule('utils.js');
    var ForkingService = useSystem('ForkingService');
    //var Service = useSystem('Service');


    function _parseCmd () {
        var debugMode = false;
        var servicesToStart = [];
        function findServiceIndex(selectorObj) {
            if (selectorObj.id){
                return servicesToStart.findIndex(s => s.id == selectorObj.id);
            }
            if (selectorObj.path){
                return servicesToStart.findIndex(s => s.path == selectorObj.path);
            }
            return servicesToStart.findIndex(s => s.type == selectorObj.type);
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
            }
            var configFileName = "config.json";
            for (var i = 2; i <= process.argv.length; i++) {
                var arg = process.argv[i];
                if (!arg) continue;
                if (arg.indexOf("--inspect") >= 0) {
                    debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                    continue;
                }
                if (arg === "--old") {
                    servicesToStart.useOldStart = true;
                    continue;
                }
                if (arg === "--port") {
                    if (arg.indexOf("=") > 0) {
                        servicesToStart.port = arg.split("=")[1];
                    }
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
                    continue;
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
                                        if (configFile.id && configFile.id != 'auto') {
                                            servicesToStart.id = configFile.id;
                                        }
                                        continue;
                                    }
                                    if (key == "port"){
                                        servicesToStart.port = configFile.port;
                                        continue;
                                    }
                                    if (key == "ports"){
                                        //Frame.portRanges = Frame.portRanges.concat(configFile.ports);
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
            Frame.debugMode = typeof v8debug === 'object' || debugMode;
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
        console.log("RootService for ILAB v4");
        Frame.serviceType = this.serviceType = "RootService";
        try {
            var servicesToStart = _parseCmd();
            if (servicesToStart.id){
                Frame.setId(servicesToStart.id);
            }
            //console.log("Detected " + servicesToStart.length + " services to start");
            var debugMode =  Frame.debugMode;
            Frame.pipeId = Frame.getPipe(Frame.serviceId);
            var result = Service.call(this, { id: Frame.serviceId });
            this.on("error", function (err) {
                if (err.serviceId) {
                    console.log("Service error: " + err.serviceId);
                }
                console.error(err);
                err.handled = true;
            });
            var frames = [];
            for (var i = 0; i <= servicesToStart.length; i++) {
                ((service)=> {
                    var frame = Frame.startChild(service);
                    if (frame) {
                        frames.push(new Promise((resolve, reject) => {
                            frame.once("started", (cp) => {
                                if (cp.serviceType) {
                                    Frame.log("Started: " + cp.serviceType + "#" + cp.id);
                                } else {
                                    Frame.log("Started: " + cp.id);
                                }
                                resolve();
                            });
                        }));
                    }
                })(servicesToStart[i]);
            }
            Promise.all(frames).then(() => {
                console.log("All started!");
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


