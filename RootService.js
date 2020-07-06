var Path = require('path');
var os = require("os");

function _init() {
    useModule('utils.js');
    //var ForkingService = useSystem('ForkingService');
    var Service = useSystem('Service');


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
                if (arg === "--new") {
                    servicesToStart.useNewStart = true;
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
                                if (typeof (config) == "object"){
                                  config = parseConfig(config, key);
                                  if (config){
                                      mergeConfig(config);
                                  }
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
                                    if (typeof (config) == "object"){
                                      var config = parseConfig(configFile[key], key);
                                      if (config){
                                          mergeConfig(config);
                                      }
                                    } else {
                                      servicesToStart[key] = config;
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
            return servicesToStart;
        }
        catch (err) {
            console.log("RootError: ");
            console.error(err);
            return servicesToStart;
        }
    };

    global.RootService = function RootService() {
        console.log("RootService for ILAB v3.8.1");
        this.serviceType = "RootService";
        try {
            var servicesToStart = _parseCmd();
            if (servicesToStart.id){
                Frame.setId(servicesToStart.id);
            }
            //console.log("Detected " + servicesToStart.length + " services to start");
            var debugMode =  Frame.debugMode;
            Frame.pipeId = Frame.getPipe(Frame.serviceId);
            startOldMethod = ()=> {
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
                var incrementalPort = servicesToStart.port ? parseInt(servicesToStart.port) : 5600;
                if (!Frame.servicePort) Frame.servicePort = incrementalPort;
                var ServicesManager = useService(smConfig.path);
                if (ServicesManager) {
                    if (smConfig.id) Frame.setId(smConfig.id);
                    var servicesManager = new ServicesManager(smConfig, function () {
                        /*if (Frame.portRanges){
                        }*/
                        return incrementalPort += 5;
                    });
                    if (servicesManager.id && Frame.serviceId != servicesManager.id) Frame.setId(servicesManager.id);
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
                    console.log("Detected " + params.length + " services to start");
                    servicesManager.on("service-started", function (serviceId, config, description) {
                        if (description && description.serviceType) {
                            console.log("Service started: " + description.serviceType + "#" + serviceId + " on TCP " + description.tcpPort);
                        } else {
                            console.log("Service started: " + serviceId + " on TCP " + description.tcpPort);
                        }
                    })
                    servicesManager.StartServices(params).then(function (result) {
                        console.log("All started!");
                    }).catch((err) => {
                        console.error(err);
                    });
                }
            }
            startNewMethod = () => {
                var result = Service.call(this, { id: Frame.serviceId });
                this.on("error", function (err) {
                    if (err.serviceId) {
                        console.log("Service error: " + err.serviceId);
                    }
                    console.error(err);
                    err.handled = true;
                });
                this.on("child-started", function (serviceId, port, config, serviceType) {
                    if (serviceType) {
                        console.log("Service started: " + serviceType + "#" + serviceId + " on TCP " + port);
                    } else {
                        console.log("Service started: " + serviceId + " on TCP " + port);
                    }
                });
                var frames = [];
                for (var i = 0; i <= servicesToStart.length; i++) {
                    var service = servicesToStart[i];
                    var frame = Frame.startChild(service);
                    if (frame) {
                        frames.push(new Promise((resolve, reject) => {
                            frame.once("started", () => {
                                console.log(frame.id + " started");
                                resolve();
                            });
                        }));
                    }
                }
                Promise.all(frames).then(() => {
                    console.log("All started!");
                });
            }
            if (servicesToStart.useNewStart){
                console.log("========== starting new method ==========");
                startNewMethod();
            } else {
                console.log("---------- starting old method ----------");
                startOldMethod();
            }
        } catch (err) {
            console.log("RootError: ");
            console.error(err);
        }
    };

    Inherit(RootService, Service, {

    });
}

process.isChild = false;

if (!global.Frame){
    Frame = global.Frame = { isChild: process.isChild }
    require(Path.resolve("./Frame.js"));
    _init();
    RootService();
    //Frame._startFrame(RootService);
} else {
    Frame.isChild = process.isChild;
    _init();
    module.exports = RootService;
}
