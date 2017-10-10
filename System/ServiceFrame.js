var Path = require('path');
var fs = require('fs');
var http = require('http');
require(Path.resolve("./Frame.js"));
var ServiceProxy = useRoot('/System/ServiceProxy');
var Service = useRoot('/System/Service');

Frame.servicesManagerPort = parseInt(process.env.managerPort);
Frame.serviceId = process.env.serviceId;
Frame.node = process.env.nodeName;
Frame.nodePath = process.env.nodePath;
Frame.servicePort = process.env.servicePort;

Frame.error = function(err){
    if (typeof(err) == "object"){
        process.send({type: "error", message: err.message, item: err.stack});
    }
    else {
        process.send({type: "error", message: err, item: null});
    }
};

Frame.fatal = function(err){
    Frame.error(err);
    setImmediate(function () {
        process.exit();
    });
};

Frame.log = function(log){
    process.send({type : "log", item: log});
    console.log(log);
};

process.cwd(Frame.workingPath);

Frame._initFrame = function () {
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
                    try {
                        Frame.nodePath =  Path.resolve("./Temp/" + (Frame.serviceId ? Frame.serviceId + ".js" : "UnknownTempService.js"));
                        fs.writeFile(Frame.nodePath, rawData, function (err, result) {
                           if (err){
                               Frame.fatal(err);
                               return;
                           }
                           Frame._initFrame();
                        });
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
    ServiceProxy.init().then(function (servicesManager) {
        var sm = global.ServicesManager = {};
        for (var item in servicesManager){
            sm[item] = servicesManager[item];
        }
        sm.GetServices = ServiceProxy.GetServices;
        sm.GetService = ServiceProxy.GetService;

        var params = {};
        if (process.env.params && typeof process.env.params == "string") params = JSON.parse(process.env.params);
        if (node.hasPrototype("Service")) {
            if (params && params.id) {
                Frame.serviceId = params.id;
                if (node.serviceId) {
                    Frame.serviceId = node.serviceId;
                }
                else {
                    if (!Frame.serviceId) {
                        Frame.serviceId = node.name;
                    }
                }
            }
            service = new node(params);
            if (service.serviceId){
                Frame.serviceId = service.serviceId;
            }
            service.on("error", function (err) {
                // console.error(err);
                Frame.error(err);
            });
            process.on('uncacughtException', function () {
                process.exit();
            });
        }
        else {
            console.log(Frame.node + " node starting...");
            node = node(params);
            console.log(Frame.nodePath + " node started");
        }
        process.send({type : "control", state: "started", serviceId: Frame.serviceId});
    }).catch(function (err) {
        Frame.error(err);
        //console.log("Fork error in " + Frame.serviceId + " " + Frame.nodePath);
        //console.error(err.stack);
    });
};

process.once("exit", function(){
    console.log(Frame.serviceId + ":" + Frame.servicePort + " exiting.");
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on("message", function(pmessage){
    if (pmessage == 'EXIT-REQUEST'){
        process.emit("EXIT-REQUEST");
        var tm = setTimeout(function(){
            process.exit();
        }, 500);
        process.once("exit", function(){
            clearTimeout(tm);
        });
    }
});


Frame._initFrame();