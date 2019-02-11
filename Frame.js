var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');

if (!global.Frame) {
    Frame = {isChild: true};
}

function prepareArgAspect(func){
    return function (path) {
        if (path.indexOf(".js") != path.length - 3){
            path += ".js";
        }
        return func(path);
    }
}

global.useModule = Frame.useModule = prepareArgAspect(function(path){
    return require(Path.resolve(Frame.ModulesPath + path));
});
global.useService = Frame.useService = prepareArgAspect(function(path){
    return require(Path.resolve(Frame.ServicesPath + path));
});
global.useRoot = Frame.useRoot = prepareArgAspect(function(path){
    return require(Path.resolve(Frame.ilabPath + path));
});
global.useSystem = Frame.useSystem = prepareArgAspect(function(path){
    return require(Path.resolve(Frame.SystemPath + path));
});

Frame.parentId = getEnvParam("parentId", null);
Frame.rootId = getEnvParam("rootId", null);
Frame.basePath = process.cwd();
Frame.ilabPath = Frame.basePath;
if (Frame.ilabPath.indexOf("/") != Frame.ilabPath.length - 1) Frame.ilabPath += "/";
Frame.workingPath =  process.env.workDir == 'string' ? Path.resolve(process.env.workDir) : process.cwd();
Frame.NodesPath =  Frame.ilabPath + "Nodes/";
Frame.ModulesPath = Frame.ilabPath + "Modules/";
Frame.ServicesPath = Frame.ilabPath + "Services/";
Frame.SystemPath = Frame.ilabPath + "System/";
Frame.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";
Frame.Nodes = {};
Frame.Modules = [];
Frame.Services = {};


useSystem("ForkManager");
useSystem("FrameRouter");

Frame.log = function(){
    console.log.apply(console, arguments);
}

Frame.newId = function(){
    return require('uuid/v4')();
}

Frame.setId = function(id){
    if (Frame.serviceId && Frame.serviceId != id){
        console.log("Node id changing from " + Frame.serviceId + " to " + id);
    }
    if (!Frame.isChild){
        Frame.rootId = id;
    }
    Frame.id = id;
    Frame.serviceId = id;
    Frame.pipeId = Frame.getPipe(id);
}


Frame.getPipe = function(serviceId){
    return os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + serviceId : '/tmp/ilab-3-' + serviceId;
};

function getEnvParam(name, defaultValue){
    return process.env[name] ? process.env[name] : (
        process.env.params ? (process.env.params[name] ? process.env.params[name] : defaultValue) : defaultValue
    )
};

Frame.fatal = function(err){
    Frame.error(err);
    setImmediate(function () {
        process.exit();
    });
};

Frame.log = function(log){
    if (process.connected){
        process.send({type: "log", item: log});
    }
    if (typeof log == "string" && log.indexOf(Frame.serviceId) != 0) {
        log = Frame.serviceId + ": " + log;
    }
    console.log(log);
};

Frame.send = function(arg1, arg2){
    if (Frame.isChild && process.connected){
       return process.send(arg1, arg2);
    }
};


Frame.error = function(err){
    if (process.connected){
        if (typeof (err) == "object") {
            process.send({type: "error", message: err.message, item: err.stack});
        } else {
            process.send({type: "error", message: err, item: null});
        }
    }
    console.error(err);
};

Frame.node = getEnvParam("nodeName", '');
Frame.nodePath = getEnvParam("nodePath", '');


Frame._parseCmd = function() {
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
                    path: Frame.ServicesPath + arg + ".js"
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

Frame._initFrame = function () {
//    Frame.send({type: "control", state: "loaded"});
    try {
        if (Frame.nodePath.indexOf("http://") == 0 || Frame.nodePath.indexOf("https://") == 0) {
            http.get(Frame.nodePath, (res) => {
                var statusCode = res.statusCode;
                if (statusCode !== 200) {
                    Frame.fatal("Can't get node: " + res.statusCode + " : " + Frame.nodePath);
                    return;
                }
                res.setEncoding('utf8');
                var rawData = '';
                res.on('data', (chunk) => rawData += chunk);
                res.on('end', () => {
                    try {/*
                        Frame.nodePath = Frame.serviceId ? Frame.serviceId : "UnknownTempService" + Math.random() + ".js";
                        Frame.nodePath = Frame.nodePath.replace(/\//ig, '-');
                        Frame.nodePath = Frame.nodePath.replace(/\\/ig, '-');
                        if (Frame.nodePath.indexOf(".js") != Frame.nodePath.length - 3) {
                            Frame.nodePath += ".js";
                        }
                        const tempPath = Path.resolve("./Temp/");
                        if (!fs.existsSync(tempPath)){
                            fs.mkdirSync(tempPath);
                        }
                        Frame.nodePath =  Path.resolve("./Temp/" + Frame.nodePath);
                        fs.writeFile(Frame.nodePath, rawData, function (err, result) {
                            if (err){
                                Frame.fatal(err);
                                return;
                            }
                            Frame._initFrame();
                        });
                        */
                        Frame._startFrame(rawData);
                    } catch (e) {
                        Frame.fatal(e);
                    }
                });
            }).on('error', function(e){
                Frame.fatal(e);
            });
            return;
        }
        else {
            var node = require(Frame.nodePath);
            Frame._startFrame(node);
        }
    }
    catch (err) {
        Frame.fatal(err);
    }
};

Frame._startFrame = function (node) {
    try{
        var params = getEnvParam("params", {});
        if (params && typeof params == "string") params = JSON.parse(params);

        if (typeof node == "string") {
            console.log(Frame.nodePath + " node starting...");
            process.on('uncaughtException', function () {
                process.exit();
            });
            node = vm.Script(node, { filename: Frame.nodePath || Frame.node || "tempNode.vm" });
            node = node.runInThisContext();
            console.log(Frame.nodePath + " node started");
        }
        Frame.serviceType = typeof node;
        if (node) {
            if (typeof node == "function") {
                Frame.serviceType = node.name;
                var service = new node(params);
                if (node.hasPrototype("Service")) {
                    if (service.serviceType) {
                        Frame.serviceType = service.serviceType;
                    } else {
                        Frame.serviceType = service.name;
                    }
                    if (service.serviceId) {
                        if (Frame.serviceId != service.serviceId){
                            Frame.serviceId = service.serviceId;
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
                        Frame.error(err);
                    });
                }
                process.on('uncaughtException', function (err) {
                    Frame.error(err);
                    process.exit();
                });
            }
        }
        Frame.send({type: "control", state: "started",serviceId: Frame.serviceId, serviceType: Frame.serviceType, pipe: Frame.pipeId, config : params });
    }
    catch (err){
        Frame.error(err);
    }
};



Frame.exitingInteval = null;

Frame.exit = function(){
    if (Frame.exitingInteval == null) {
        process.emit("exiting");
        var date = (new Date());
        //console.log(Frame.serviceId + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
        Frame.exitingInteval = setTimeout(function () {
            process.exit();
        }, 10);
        process.once("exit", function () {
            clearTimeout(Frame.exitingInteval);
        });
    }
}

process.once("exit", function(){
    Frame.exit();
    // var date = (new Date());
    //console.log(Frame.serviceId + ":" + Frame.servicePort + " exited:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on("message", function(pmessage){
    if (pmessage == 'EXIT-REQUEST'){
       Frame.exit();
    }
});

process.once("SIGTERM", Frame.exit);
process.once("SIGINT", Frame.exit);

//console.log(Frame.isChild ? "CHILD " : "" + "FRAME: " + Frame.id + "");

if (Frame.isChild) {
    Frame.serviceId = getEnvParam("serviceId", Frame.newId());
    var nodesConfig = Frame._parseCmd();
    Frame.setId(Frame.serviceId);
    Frame.send({type: "control", state: "loaded",serviceId: Frame.serviceId, pipe: Frame.pipeId, config : nodesConfig });
    if (nodesConfig && nodesConfig.length) {
        if (!Frame.nodePath) {
            Frame.nodePath = nodesConfig[0].path;
            Frame.node = nodesConfig[0].id;
        }
        Frame._initFrame();
    } else {
        if (!Frame.nodePath) {
            Frame.nodePath = Frame.ilabPath + "RootService.js";
            Frame.node = "RootService";
        }
        Frame._initFrame();
    }
}