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
process.NodesPath = process.ilabPath + "Nodes/";
process.ModulesPath = process.ilabPath + "Modules/";
process.ServicesPath = process.ilabPath + "Services/";
process.SystemPath = process.ilabPath + "System/";
process.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";
process.Nodes = [];
process.Modules = [];
process.Services = [];
process.Childs = [];

process.router = new useSystem("XRouter")();
useSystem("ForkManager");

process.on("message", (message) => {
    process.router.routeMessage(message);
});

process.on("child-message", (cp, message) => {
    process.router.routeMessage(message);
});

process.log = function(){
    console.log.apply(console, arguments);
}

process.newId = function(){
    return require('uuid/v4')();
}

process.setId = function(id){
    if (!process.isChild){
        process.rootId = id;
    }
    process.id = id;
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

var oldLog = console.log;
console.log = function () {
    if (typeof arguments[0] == "string" && arguments[0].indexOf(process.id) != 0) {
        arguments[0] = process.id + ": " + arguments[0];
    }
    oldLog.apply(this, arguments);
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

process._detectDebugMode = function() {
    var debugMode = false;
    try{
        if (process.execArgv[0] && (process.execArgv[0].indexOf("--inspect") >= 0 || process.execArgv[0].indexOf("--debug") >= 0)){
            debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
        }
        for (var i = 2; i <= process.argv.length; i++) {
            var arg = process.argv[i];
            if (!arg) continue;
            if (arg.indexOf("--inspect") >= 0) {
                debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                continue;
            }
        }
        process.debugMode = debugMode;
        // console.log('Frame: servicesToStart ', servicesToStart)
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
    }
};

process.startCode = function (path, params) {
    process.log("Virtual node starting...");
    node = vm.Script(node, { filename: process.nodePath || process.node || "tempNode.vm" });
    node = node.runInThisContext();
    process.log("Virtual node started");
};

process.start = function (path, params) {
    var originalPath = path;
    function _startCode (node) {
        try{
            if (node) {
                if (typeof node == "string") {
                   process.startCode(path, params);
                }
                if (typeof node == "function") {
                    var nodeType = node.name;
                    var nodeId = node.name;
                    var nodeClass = null;
                    var result = null;
                    if (node.prototype) {
                        if (node.hasPrototype("Service")) {
                            var service = new node(params);
                            if (service) {
                                if (service.serviceType) {
                                    nodeType = service.serviceType;
                                }
                                if (service.serviceId) {
                                    nodeId = service.serviceId;
                                }
                            }
                            nodeClass = 'service';
                        } else {
                            node = new node(params);
                            if (node) {
                                if (node.type) {
                                    nodeType = node.type;
                                }
                                if (node.id) {
                                    nodeId = node.id;
                                }
                            }
                            nodeClass = 'class';
                        }
                    } else {
                        result = node(params);
                        if (node) {
                            if (node.type) {
                                nodeType = node.type;
                            }
                            if (node.id) {
                                nodeId = node.id;
                            }
                        }
                        nodeClass = 'function';
                    }
                    var message = {
                        type: "control",
                        state: "started",
                        nodeType: nodeClass,
                        result: result,
                        serviceId: nodeId,
                        serviceType: nodeType,
                        pipe: process.getPipe(nodeId),
                        config: params
                    };
                    if (result) message.result = result;
                    process.send(message);
                    return message;
                }
            } else {
                process.log("unresolved start.")
            }
        }
        catch (err){
            process.error(err);
        }
    };
    try {
        if (!params) params = {};
        if (typeof path == "function") {
            return _startCode(path);
        }
        if (typeof path == "string") {
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
                            _startCode(rawData);
                        } catch (e) {
                            process.fatal(e);
                        }
                    });
                }).on('error', function (e) {
                    process.fatal(e);
                });
                return;
            } else {
                var node = require(path);
                _startCode(node);
            }
        }
    }
    catch (err) {
        process.fatal(err);
    }
};

process.exitingInteval = null;

process.exit = function(){
    if (process.exitingInteval == null) {
        process.emit("exiting");
        var date = (new Date());
        //console.log(process.id + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
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
});

process.on('uncaughtException', function (ex) {
    console.error(ex)
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

process.setId(getEnvParam("id", process.newId()));
process._detectDebugMode();

if (process.isChild) {
    process.type = "container";
    process.send({type: "control", state: "loaded", id: process.id, pipe: process.pipeId});
}

console.log((process.isChild ? "CHILD" : "FRAME") + " loaded");