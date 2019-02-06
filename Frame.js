var Path = require('path');
var fs = require('fs');
var os = require("os");

global.Frame = {};

Frame = { isChild : false };

Frame.basePath = process.cwd();
Frame.ilabPath = Frame.basePath;

Frame.workingPath =  process.env.workDir == 'string' ? Path.resolve(process.env.workDir) : (typeof(process.argv[2]) == 'string' ? typeof(process.argv[2]) : process.cwd());

Frame.NodesPath =  Frame.ilabPath + "/Nodes/";
Frame.ModulesPath = Frame.ilabPath + "/Modules/";
Frame.ServicesPath = Frame.ilabPath + "/Services/";
Frame.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";
Frame.Nodes = {};
Frame.Modules = [];
Frame.Services = {};

process.once("SIGTERM", ()=>{
    process.emit("exiting");
    var date = (new Date());
    //console.log(Frame.serviceId + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
    var tm = setTimeout(function(){
        process.exit(1);
    }, 10);
    process.once("exit", function(){
        clearTimeout(tm);
    });
});
process.once("SIGINT", ()=>{
    process.emit("exiting");
    var date = (new Date());
    //console.log(Frame.serviceId + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
    var tm = setTimeout(function(){
        process.exit(1);
    }, 10);
    process.once("exit", function(){
        clearTimeout(tm);
    });
});

global.useModule = Frame.useModule = function(path){
    if (path.indexOf(".js") != path.length - 3){
        path += ".js";
    }
    return require(Path.resolve(Frame.ModulesPath + path));
};

global.useService = Frame.useService = function(path){
    if (Frame.isChild){
        throw new Error("Trying to use service " + path + " without proxy!");
    }
    if (path.indexOf(".js") != path.length - 3){
        path += ".js";
    }
    return require(Path.resolve(Frame.ServicesPath + path));
};

global.useRoot = Frame.useRoot = function(path){
    if (path.indexOf(".js") != path.length - 3){
        path += ".js";
    }
    return require(Path.resolve(Frame.ilabPath + "/" + path));
};

global.useSystem = Frame.useSystem = function(path){
    return require(path);
    //return require(Path.resolve(Frame.NodeModulesPath + path));
};

Frame.log = function(){
    console.log.apply(console, arguments);
}

Frame.newId = function(){
    return useSystem('uuid/v4')();
}

Frame.parseCmd = function () {
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
        var wd = process.argv[2];
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
            if (arg === "--demo") {
                configFileName = "config-sample.json";
            }
            if (arg === "--demo" || arg.indexOf("--config") === 0) {
                // используется config.json если аргументом идёт флаг --config
                if (arg.indexOf("=") > 0) {
                    configFileName = arg.split("=")[1];
                }
                if (fs.existsSync(Path.resolve(configFileName))) {
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
                                var config = parseConfig(configFile[key], key);
                                if (config){
                                    mergeConfig(config);
                                }
                            }
                        }
                    }

                }
                continue;
            }
            if (arg.indexOf("--port") >= 0) {
                Frame.servicePort = Frame._availablePort = Frame.portsStart = parseInt(arg.split("=")[1]);
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