var Path = require('path');
var fs = require('fs');

Frame = { isChild : true };
process.env.isChild = true;
Frame.ilabPath = Frame.basePath = process.cwd();
Frame.workingPath =  process.env.workDir == 'string' ? Path.resolve(process.env.workDir) : process.cwd();
Frame.NodesPath =  Frame.ilabPath + "/Nodes/";
Frame.ModulesPath = Frame.ilabPath + "/Modules/";
Frame.ServicesPath = Frame.ilabPath + "/Services/";
Frame.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";

Frame.servicesManagerPort = parseInt(process.env.managerPort);
Frame.node = process.env.nodeName;
Frame.nodePath = process.env.nodePath;

Frame.error = function(err){
    process.send({type : "error", item: err.stack});
    console.log("Node error in " + process.env.serviceId);
    console.error(err.stack);
};

Frame.log = function(log){
    process.send({type : "log", item: log});
    console.log(log);
};

process.cwd(Frame.workingPath);

global.useModule = Frame.useModule = function(path){
    if (path.indexOf(".js") != path.length - 3){
        path += ".js";
    }
    return require(Path.resolve(Frame.ModulesPath + path));
};

global.useService = Frame.useService = function(path){
   /* if (path.indexOf(".js") != path.length - 3){
        path += ".js";
    }*/
    throw new Error("Try to use service " + path + " without proxy!");
    return null;
};

global.useSystem = Frame.useSystem = function(path){
    return require(path);
    //return require(Path.resolve(Frame.NodeModulesPath + path));
};

Frame._initFrame = function () {
    try {
        console.log(Frame.node + " node starting...");
        var node = require(Frame.nodePath);
        node = node(Frame.node);
        console.log(Frame.nodePath + " node started");
    }
    catch (err) {
        Frame.error(err);
    }
};

process.once("beforeExit", function(){
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