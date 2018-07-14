var Path = require('path');

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