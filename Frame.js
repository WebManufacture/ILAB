var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');

function prepareArgAspect(func){
    return function (path) {
        if (path.indexOf(".js") != path.length - 3){
            path += ".js";
        }
        return func(path);
    }
}

process.isChild = process.connected;

global.useModule = process.useModule = prepareArgAspect(function(path){
    return require(Path.resolve(process.ModulesPath + path));
});
global.useService = process.useService = prepareArgAspect(function(path){
    return require(Path.resolve(process.ServicesPath + path));
});
global.useRoot = process.useRoot = prepareArgAspect(function(path){
    return require(Path.resolve(process.ilabPath + path));
});
global.useSystem = process.useSystem = prepareArgAspect(function(path){
    return require(Path.resolve(process.SystemPath + path));
});

process.parentId = getEnvParam("parentId", null);
process.rootId = getEnvParam("rootId", null);
process.basePath = process.cwd();
process.ilabPath = process.basePath;
if (process.ilabPath.indexOf("/") != process.ilabPath.length - 1) process.ilabPath += "/";
process.workingPath =  process.env.workDir == 'string' ? Path.resolve(process.env.workDir) : process.cwd();
process.NodesPath =  process.ilabPath + "Nodes/";
process.ModulesPath = process.ilabPath + "Modules/";
process.ServicesPath = process.ilabPath + "Services/";
process.SystemPath = process.ilabPath + "System/";
process.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";
process.Nodes = {};
process.Modules = [];
process.Services = {};

useSystem("FrameRouter");

process.log = function(){
    console.log.apply(console, arguments);
}

process.newId = function(){
    return require('uuid/v4')();
}

process.setId = function(id){
    if (process.serviceId && process.serviceId != id){
        console.log("Node id changing from " + process.serviceId + " to " + id);
    }
    if (!process.isChild){
        process.rootId = id;
    }
    process.id = id;
    process.serviceId = id;
    process.pipeId = process.getPipe(id);
}


process.getPipe = function(serviceId){
    return os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + serviceId : '/tmp/ilab-3-' + serviceId;
};

function getEnvParam(name, defaultValue){
    return process.env[name] ? process.env[name] : (
        process.env.params ? (process.env.params[name] ? process.env.params[name] : defaultValue) : defaultValue
    )
};

process.fatal = function(err){
    process.error(err);
    setImmediate(function () {
        process.exit();
    });
};

process.log = function(log){
    if (process.connected){
        process.send({type: "log", item: log});
    }
    if (typeof log == "string" && log.indexOf(process.serviceId) != 0) {
        log = process.serviceId + ": " + log;
    }
    console.log(log);
};

process.send = function(arg1, arg2){
    if (process.isChild && process.connected){
       return process.send(arg1, arg2);
    }
};


process.error = function(err){
    if (process.connected){
        if (typeof (err) == "object") {
            process.send({type: "error", message: err.message, item: err.stack});
        } else {
            process.send({type: "error", message: err, item: null});
        }
    }
    console.error(err);
};

process.node = getEnvParam("nodeName", '');
process.nodePath = getEnvParam("nodePath", '');


process._parseCmd = function() {
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
                config.id = process.newId();
            }
        } else {
            if (key) {
                config.id = key;
            }
            else {
                config.id = process.newId();
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
            if (arg.indexOf("--") == 0) continue;
            if (arg.indexOf(".js") < 0) {
                mergeConfig(parseConfig({
                    path: process.ServicesPath + arg + ".js"
                }));
            } else {
                mergeConfig(parseConfig({
                    path: arg
                }));
            }
        }
        process.debugMode = debugMode;
        // console.log('Frame: servicesToStart ', servicesToStart)
        return servicesToStart;
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
        return servicesToStart;
    }
};

process._initFrame = function (path) {
//    process.send({type: "control", state: "loaded"});
    try {
        if (path.indexOf("http://") == 0 || path.indexOf("https://") == 0) {
            http.get(path, (res) => {
                var statusCode = res.statusCode;
                if (statusCode !== 200) {
                    process.fatal("Can't get node: " + res.statusCode + " : " + path);
                    return;
                }
                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', (chunk) => rawData += chunk);
                res.on('end', () => {
                    try {/*
                        process.nodePath = process.serviceId ? process.serviceId : "UnknownTempService" + Math.random() + ".js";
                        process.nodePath = process.nodePath.replace(/\//ig, '-');
                        process.nodePath = process.nodePath.replace(/\\/ig, '-');
                        if (process.nodePath.indexOf(".js") != process.nodePath.length - 3) {
                            process.nodePath += ".js";
                        }
                        const tempPath = Path.resolve("./Temp/");
                        if (!fs.existsSync(tempPath)){
                            fs.mkdirSync(tempPath);
                        }
                        process.nodePath =  Path.resolve("./Temp/" + process.nodePath);
                        fs.writeFile(process.nodePath, rawData, function (err, result) {
                            if (err){
                                process.fatal(err);
                                return;
                            }
                            process._initFrame();
                        });
                        */
                        process._startFrame(rawData);
                    } catch (e) {
                        process.fatal(e);
                    }
                });
            }).on('error', function(e){
                process.fatal(e);
            });
            return;
        }
        else {
            var node = require(path);
            process._startFrame(node);
        }
    }
    catch (err) {
        process.fatal(err);
    }
};

process._startFrame = function (node) {
    try{
        var params = getEnvParam("params", {});
        if (params && typeof params == "string") params = JSON.parse(params);

        if (typeof node == "string") {
            console.log(process.nodePath + " node starting...");
            process.on('uncaughtException', function () {
                process.exit();
            });
            node = vm.Script(node, { filename: process.nodePath || process.node || "tempNode.vm" });
            node = node.runInThisContext();
            console.log(process.nodePath + " node started");
        }
        process.serviceType = typeof node;
        if (node) {
            if (typeof node == "function") {
                process.serviceType = node.name;
                var service = new node(params);
                if (node.hasPrototype("Service")) {
                    if (service.serviceType) {
                        process.serviceType = service.serviceType;
                    } else {
                        process.serviceType = service.name;
                    }
                    if (service.serviceId) {
                        if (process.serviceId != service.serviceId){
                            process.serviceId = service.serviceId;
                        }
                        var oldLog = console.log;
                        console.log = function () {
                            if (typeof arguments[0] == "string" && arguments[0].indexOf(service.serviceId) != 0) {
                                arguments[0] = service.serviceId + ": " + arguments[0];
                            }
                            oldLog.apply(this, arguments);
                        };
                    }
                    service.on("error", function (err) {
                        // console.error(err);
                        process.error(err);
                    });
                }
                process.on('uncaughtException', function (err) {
                    process.error(err);
                    process.exit();
                });
            }
        }
        process.send({type: "control", state: "started",serviceId: process.serviceId, serviceType: process.serviceType, pipe: process.pipeId, config : params });
    }
    catch (err){
        process.error(err);
    }
};

process.exitingInteval = null;

process.exit = function(){
    if (process.exitingInteval == null) {
        process.emit("exiting");
        var date = (new Date());
        //console.log(process.serviceId + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
        process.exitingInteval = setTimeout(function () {
            process.exit();
        }, 10);
        process.once("exit", function () {
            clearTimeout(process.exitingInteval);
        });
    }
}

process.once("exit", function(){
    process.exit();
    // var date = (new Date());
    //console.log(process.serviceId + ":" + process.servicePort + " exited:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on("message", function(pmessage){
    if (pmessage == 'EXIT-REQUEST'){
       process.exit();
    }
});

process.once("SIGTERM", process.exit);
process.once("SIGINT", process.exit);

//console.log(process.isChild ? "CHILD " : "" + "FRAME: " + process.id + "");

if (process.isChild) {
    process.serviceId = getEnvParam("serviceId", process.newId());
    var nodesConfig = process._parseCmd();
    process.setId(process.serviceId);
    process.send({type: "control", state: "loaded",serviceId: process.serviceId, pipe: process.pipeId, config : nodesConfig });
    if (nodesConfig && nodesConfig.length) {
        if (!process.nodePath) {
            process.nodePath = nodesConfig[0].path;
            process.node = nodesConfig[0].id;
        }
        process._initFrame();
    } else {
        if (!process.nodePath) {
            process.nodePath = process.ilabPath + "RootService.js";
            process.node = "RootService";
        }
        process._initFrame();
    }
}