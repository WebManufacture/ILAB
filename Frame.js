var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');
require('/System/FrameBase.js');

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

process.setId(process.getEnvParam("id", process.newId()));

useSystem("ForkManager");
var XRouter = useSystem("XRouter");
process.router = new XRouter(new Selector({id: process.id, type: "container"}));

process.on("message", (message) => {
    process.router.routeMessage(message);
});

process.on("child-message", (cp, message) => {
    process.router.routeMessage(message);
});

if (process.isChild) {
    process.type = "container";
    process.send({type: "control", state: "loaded", id: process.id, pipe: process.pipeId});
}

console.log((process.isChild ? "CHILD" : "FRAME") + " loaded");