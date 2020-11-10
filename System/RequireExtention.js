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
// 05.02.2018 - A.Semchenkov --- С чем совместимости, Саша !!!???
// 06.02.2019 - Саша -- О господи, я разговариваю сам с собой в собственном коде!
// 10.11.2020 - Но всегда приятно предметно поговорить с умным человеком...

process.basePath = process.cwd();
process.ilabPath = process.basePath;
if (process.ilabPath.indexOf("/") != process.ilabPath.length - 1) process.ilabPath += "/";
process.workingPath =  Path.resolve(getEnvParam('workDir'), process.cwd());
process.NodesPath = process.ilabPath + "Nodes/";
process.ModulesPath = process.ilabPath + "Modules/";
process.ServicesPath = process.ilabPath + "Services/";
process.SystemPath = process.ilabPath + "System/";

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

var Module = require('module');
var originalRequire = Module.prototype.require;

require = global.require = Module.prototype.require = function(path){
    if (path && typeof path == 'string' && path.toLowerCase() == "container"){
        return process.container;
    }
    if (path && typeof path == 'string' && path.toLowerCase() == "router"){
        return process.router;
    }
    return originalRequire.apply(this, arguments);
};

module.exports = require;
