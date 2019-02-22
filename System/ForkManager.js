var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');

process.Statuses = ["new", "killed", "exited", "paused", "reserved", "stopping", "error", "loaded", "started", "working"];
process.STATUS_NEW = 0;
process.STATUS_KILLED = 1;
process.STATUS_EXITED = 2;
process.STATUS_PAUSED = 3;
process.STATUS_STOPPING = 5;
process.STATUS_ERROR = 6;
process.STATUS_LOADED = 7;
process.STATUS_STARTED = 8;
process.STATUS_WORKING = 9;

process.childs = [];

process.startChild = function(params){
    if (typeof params != 'object' || !params || !params.id || !params.path) return null;
    var self = this;
    var servicePath = params.path;
    if (servicePath) {
        if (servicePath.indexOf("http://") != 0 && servicePath.indexOf("https://") != 0) {
            if (servicePath.indexOf(".js") != servicePath.length - 3) {
                servicePath += ".js";
            }
            if (servicePath.indexOf("/") < 0 && servicePath.indexOf("\\") < 0) {
                servicePath = Path.resolve(process.ServicesPath + servicePath);
            } else {
                servicePath = Path.resolve(servicePath);
            }
        }
    }

    var cpIndex = process.childs.indexOf(c => c.id == params.id);
    if (cpIndex >= 0){
        var cp = process.childs[cpIndex];
        if (cp.code > Frames.STATUS_STOPPING) return cp;
        if (cp.code == Frames.STATUS_STOPPING){
            cp.once("exit", ()=>{
                process.startChild(params);
            });
            return cp;
        }
        if (cp.code == process.STATUS_PAUSED){
            cp.send("RESUME");
            return cp;
        };
        process.childs.splice(cp, 1);
    }

    var args = [];
    //if (servicePath) args.push(servicePath);
    var options = {
        silent: false,
        cwd : process.workingPath,
        env : {
            serviceId: params.id,
            parentId: process.serviceId,
            rootId: process.rootId,
            nodePath: servicePath,
            params: JSON.stringify(params)
        }
    };
    if (params && params.workingPath){
        options.cwd = params.workingPath;
    };
    if (process.debugMode && process.debugPort){
        options.execArgv = ["--inspect-brk=" + (parseInt(process.debugPort) + Math.floor(Math.random()*1000))];
    }
    var cp = ChildProcess.fork(process.ilabPath + "process.js", args, options);
    cp.id = params.id;
    cp.path = params.path;
    cp.code = process.STATUS_NEW;
    process.emit("child-starting", cp);
    cp.once("exit", function(){
        cp.code = process.STATUS_EXITED;
        process.emit('child-exited', cp);
    });
    cp.on("error", function(err){
        cp.code = process.STATUS_ERROR;
        process.emit('child-error', cp, err);
    });
    cp.on("message", (obj) => {
        if (typeof obj == "object"){
            process.send(obj);
            if (obj.type == "error"){
                if (obj.item) {
                    return process.emit("child-error", new Error(obj.item + ""));
                } else {
                    return process.emit("child-error", new Error(obj.message));
                }
            }
            if (obj.type == "log"){
                cp.emit('log', cp, obj);
                return process.emit("child-log", obj.item);
            }
            if (obj.type == "control") {
                if (obj.serviceType) {
                    cp.serviceType = obj.serviceType;
                }
                if (obj.serviceId && cp.id && cp.id != obj.serviceId){
                    var oldId = cp.id;
                    cp.emit('renamed', cp, obj);
                    console.log("renamed from " + cp.id + " to " + obj.serviceId);
                    process.emit("child-renaming", cp, obj.serviceId);
                    process.emit("child-renaming-" + cp.id, cp, obj.serviceId);
                    cp.id = obj.serviceId;
                    process.emit("child-renamed", cp, oldId)
                    return;
                }
                if (obj.state == "started") {
                    cp.code = process.STATUS_STARTED;
                    cp.emit('started', cp, obj);
                    process.emit("child-started-" + cp.id, cp, obj);
                    process.emit("child-started", cp, obj);
                    return;
                }
                if (obj.state == "loaded") {
                    cp.code = process.STATUS_LOADED;
                    cp.emit('loaded', cp, obj);
                    process.emit("child-loaded-" + cp.id, cp, obj);
                    process.emit("child-loaded", cp, obj);
                    return;
                }
                if (obj.state == "connected") {
                    cp.code = process.STATUS_WORKING;
                    cp.emit('connected', cp, obj);
                    process.emit("child-connected-" + cp.id, cp, obj);
                    process.emit("child-connected", cp, obj);
                    return;
                }
            }
        }
        process.emit("child-message", cp, obj);
    });
    cp.info = function(){
        return {code : cp.code, pid: cp.pid, status: ForkMon.Statuses[cp.code], path: cp.path, args: cp.args};
    };
    cp.exit  = function(){
        var self = this;
        var exited = false;
        cp.code = process.STATUS_STOPPING;
        cp.send("EXIT-REQUEST");
        //console.log("process-exit:EXIT-REQUEST");
        var exitTimeout = setTimeout(function(){
            if (!exited){
                process.log("killing: " + cp.id + " KILLED BY TIMEOUT!");
                cp.kill('SIGINT');
                self.emit("child-exited", ForkMon.STATUS_KILLED);
            }
        }, self.killTimeout);
        cp.once("exit", function(){
            exited = true;
            clearTimeout(exitTimeout);
        });
    };
    process.once('exiting', ()=>{
        cp.exit();
    });
    process.childs.push(cp);
    return cp;
}

process.getChild = function(childId){
    return process.childs.find(c => c.id == childId);
};

process.stopChild = function(childId){
    if (childId){
        var cp = process.getChild(childId);
        if (cp){
            cp.exit();
            return cp;
        }
    }
    return null;
};