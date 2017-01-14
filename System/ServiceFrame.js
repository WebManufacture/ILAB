var Path = require('path');
var fs = require('fs');
require(Path.resolve("./Frame.js"));
var ServiceProxy = useRoot('/System/ServiceProxy');

Frame.servicesManagerPort = parseInt(process.env.managerPort);
Frame.serviceId = process.env.serviceId;
Frame.node = process.env.nodeName;
Frame.nodePath = process.env.nodePath;
Frame.servicePort = process.env.servicePort;

Frame.error = function(err){
    process.send({type : "error", message: err.message, item: err.stack});
    //console.log("Fork error in " + process.env.serviceId);
    //console.error(err.stack);
};

Frame.log = function(log){
    process.send({type : "log", item: log});
    console.log(log);
};

process.cwd(Frame.workingPath);

Frame._initFrame = function () {
    try {
        //console.log(Frame.serviceId + ":" + Frame.servicePort + " starting...");
        ServiceProxy.init().then(function (servicesManager) {
            servicesManager.GetServices = ServiceProxy.GetServices;
            servicesManager.GetService = ServiceProxy.GetService;
            global.ServicesManager = servicesManager;

            var node = require(Frame.nodePath);
            if (node.serviceId){
                service = new node(Frame.servicePort, Frame.serviceId);
                service.on("error", function(err){
                    console.error(err);
                    Frame.error(err);
                });
            }
            else{
                console.log(Frame.node + " node starting...");
                node = node(Frame.node);
                console.log(Frame.nodePath + " node started");
            }
            process.send({type : "control", state: "started"});
        });
    }
    catch (err) {
        Frame.error(err);
        process.exit();
    }
};

process.once("exit", function(){
    console.log(Frame.serviceId + ":" + Frame.servicePort + " exiting.");
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