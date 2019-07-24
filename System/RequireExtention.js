var Path = require('path');
var os = require('os');

function getEnvParam(name, defaultValue){
    return process.env[name] ? process.env[name] : (
        process.env.params ? (process.env.params[name] ? process.env.params[name] : defaultValue) : defaultValue
    )
};

function prepareArgAspect(func){
    return function (path) {
        if (path.indexOf(".js") != path.length - 3){
            path += ".js";
        }
        return func(path);
    }
}

//Оставлено для совместимости!
process.basePath = process.cwd();
process.ilabPath = process.basePath;
if (process.ilabPath.indexOf("/") != process.ilabPath.length - 1) process.ilabPath += "/";
process.workingPath =  Path.resolve(getEnvParam('workDir'), process.cwd());
process.NodesPath = process.ilabPath + "Nodes/";
process.ModulesPath = process.ilabPath + "Modules/";
process.ServicesPath = process.ilabPath + "Services/";
process.SystemPath = process.ilabPath + "System/";
process.NodeModulesPath = process.execPath.replace("node.exe", "") + "node_modules/";

global.useModule = prepareArgAspect(function(path){
    return require(Path.resolve(process.ModulesPath + path));
});
global.useService = prepareArgAspect(function(path){
    return require(Path.resolve(process.ServicesPath + path));
});
global.useRoot = prepareArgAspect(function(path){
    return require(Path.resolve(process.ilabPath + path));
});
global.useSystem = prepareArgAspect(function(path){
    return require(Path.resolve(process.SystemPath + path));
});

var oldRequire = global.require;

global.require = function (path) {
    if (path && typeof path == 'string' && path.toLowerCase() == "container"){
        return process.container;
    }
    if (path && typeof path == 'string' && path.toLowerCase() == "router"){
        return process.router;
    }
    return oldRequire.apply(this, arguments);
};
