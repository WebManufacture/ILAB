var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
require(Path.resolve("./Frame.js"));
var ServiceProxy = useRoot('/System/ServiceProxy');
var Service = useRoot('/System/Service');

Frame.servicesManagerPort = parseInt(process.env.managerPort);
Frame.serviceId = process.env.serviceId;
Frame.node = process.env.nodeName;
Frame.nodePath = process.env.nodePath;
Frame.servicePort = process.env.servicePort;
Frame.pipeId = os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + Frame.serviceId : '/tmp/' + Frame.serviceId;

Frame.error = function(err){
    if (typeof process.send == 'function'){
        if (typeof (err) == "object") {
            process.send({type: "error", message: err.message, item: err.stack});
        } else {
            process.send({type: "error", message: err, item: null});
        }
    }
    console.error(err);
};

Frame.fatal = function(err){
    Frame.error(err);
    setImmediate(function () {
        process.exit();
    });
};

Frame.log = function(log){
    if (typeof process.sen == 'function'){
        process.send({type: "log", item: log});
    }
    console.log(log);
};

Frame.send = function(arg1, arg2){
    if (typeof process.send == 'function'){
        return process.send(arg1, arg2);
    } else {
        return null;
    }
}

process.cwd(Frame.workingPath);

Frame._initFrame = function () {
    Frame.send({type: "control", state: "loaded", serviceId: Frame.serviceId});
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
        try {
            var sm = global.ServicesManager = {};
            for (var item in servicesManager) {
                sm[item] = servicesManager[item];
            }
            sm.GetServices = ServiceProxy.GetServices;
            sm.GetServicesInfo = ServiceProxy.instance.GetServicesInfo;
            sm.GetService = ServiceProxy.GetService;

            var oldLog = console.log;
            console.log = function () {
                if (typeof arguments[0] == "string" && arguments[0].indexOf(Frame.serviceId) != 0) {
                    arguments[0] = Frame.serviceId + ": " + arguments[0];
                }
                oldLog.apply(this, arguments);
            };

            var params = {};
            if (process.env.params && typeof process.env.params == "string") params = JSON.parse(process.env.params);
            if (node.hasPrototype("Service")) {
                service = new node(params);
                if (service.serviceId) {
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
            Frame.send({type: "control", state: "started", serviceId: Frame.serviceId, config : params });
        }
        catch (err){
            Frame.error(err);
        }
    }).catch(function (err) {
        Frame.error(err);
        //console.log("Fork error in " + Frame.serviceId + " " + Frame.nodePath);
        //console.error(err.stack);
    });
};

process.once("exit", function(){
    var date = (new Date());
    //console.log(Frame.serviceId + ":" + Frame.servicePort + " exited:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.on("message", function(pmessage){
    if (pmessage == 'EXIT-REQUEST'){
        process.emit("exiting");
        var date = (new Date());
        //console.log(Frame.serviceId + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
        var tm = setTimeout(function(){
            process.exit();
        }, 10);
        process.once("exit", function(){
            clearTimeout(tm);
        });
    }
});


Frame._initFrame();