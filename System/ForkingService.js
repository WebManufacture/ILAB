var fs = require('fs');
var Path = require('path');
var stream = require('stream');
var EventEmitter = require('events');
var os = require("os");
var ChildProcess = require('child_process');
var util = useModule('utils');
var ForkMon = useModule("forkmon");
var Service = useRoot("System/Service");
var ServiceProxy = useRoot("System/ServiceProxy");

function ForkingService(config, portCountingFunc){
    this.debugMode = config.debugMode || Frame.debugMode;
    var self = this;

    this.StartService = function (service) {
        if (!service) return null;
        if (!service.id) service.id = Frame.newId();
        return self.startServiceAsync(service).then(function () {
            return serviceId + " started";
        });
    };
    this.StartServices = function (services) {
        if (!services) return null;
        var index = 0;
        function startNext(resolve, reject) {
            var service = services[index];
            if (service && index < services.length){
                self.startServiceAsync(service.id, service).then(()=>{
                    startNext(resolve, reject);
                }).catch((error) => {
                    reject(error);
                });
                index++;
            } else {
                resolve();
            }
        };
        return new Promise((resolve, reject)=>{
            startNext(resolve, reject);
        });
    };
    this.StopService = function (params) {
        if (!params) return null;
        var serviceId = '';
        if (typeof params == 'string') {
            serviceId = params;
        } else {
            if (!params.id) return null;
            serviceId = params.id;
        }
        return self.stopServiceAsync(serviceId).then(function (result) {
            return result;
        });
    };
    this.StopServices = function (services) {
        var index = services.length - 1;
        function stopNext(resolve, reject) {
            var key = services[index];
            if (key && index >= 0){
                self.stopServiceAsync(key, self.params[key]).then(()=>{
                    stopNext(resolve, reject);
                }).catch((error)=>{
                    reject(error);
                });
                index--;
            } else {
                resolve();
            }
        };
        return new Promise((resolve, reject)=>{
            stopNext(resolve, reject);
        });
    };
    this.ResetService = function (serviceId, params) {
        if (this.isServiceAvailable(serviceId)){
            return self.stopServiceAsync(serviceId, params).then(()=>{
                return self.startServiceAsync(serviceId, params);
            }).then(() => {
                return serviceId + " restarted";
            });
        } else {
            return self.startServiceAsync(serviceId, params).then(() => {
                return serviceId + " restarted";
            });
        }
    };
    this.ResetServices = function (services, params) {
        return self.StopServices(services, params).then(()=>{
            return self.StartServices(services, params);
        })
    };
    this.ResetAllServices = function () {
        const services = Object.keys(self.services);
        const params = [];
        services.forEach(sid => params.push(self.params[sid]));
        return self.ResetServices(services, params);
    };
    this.GetServices = function () {
        return new Promise(function(resolve, reject){ resolve(self.getServicesInfo()) });
    };


    var Path = require('path');
    var fs = require('fs');
    var http = require('http');
    var os = require('os');
    var vm = require('vm');
    var ChildProcess = require('child_process');

    Frame.Statuses = ["new", "killed", "exited", "paused", "reserved", "stopping", "error", "loaded", "started", "working"];
    Frame.STATUS_NEW = 0;
    Frame.STATUS_KILLED = 1;
    Frame.STATUS_EXITED = 2;
    Frame.STATUS_PAUSED = 3;
    Frame.STATUS_STOPPING = 5;
    Frame.STATUS_ERROR = 6;
    Frame.STATUS_LOADED = 7;
    Frame.STATUS_STARTED = 8;
    Frame.STATUS_WORKING = 9;

    Frame.childs = [];

    Frame.startChild = function(params){
        if (typeof params != 'object' || !params || !params.id || !params.path) return null;
        var self = this;
        var servicePath = params.path;
        if (servicePath) {
            if (servicePath.indexOf("http://") != 0 && servicePath.indexOf("https://") != 0) {
                if (servicePath.indexOf(".js") != servicePath.length - 3) {
                    servicePath += ".js";
                }
                if (servicePath.indexOf("/") < 0 && servicePath.indexOf("\\") < 0) {
                    servicePath = Path.resolve(Frame.ServicesPath + servicePath);
                } else {
                    servicePath = Path.resolve(servicePath);
                }
            }
        }

        var cpIndex = Frame.childs.indexOf(c => c.id == params.id);
        if (cpIndex >= 0){
            var cp = Frame.childs[cpIndex];
            if (cp.code > Frames.STATUS_STOPPING) return cp;
            if (cp.code == Frames.STATUS_STOPPING){
                cp.once("exit", ()=>{
                    Frame.startChild(params);
                });
                return cp;
            }
            if (cp.code == Frame.STATUS_PAUSED){
                cp.send("RESUME");
                return cp;
            };
            Frame.childs.splice(cp, 1);
        }

        var args = [];
        //if (servicePath) args.push(servicePath);
        var options = {
            silent: false,
            cwd : Frame.workingPath,
            env : {
                serviceId: params.id,
                parentId: Frame.serviceId,
                rootId: Frame.rootId,
                nodePath: servicePath,
                params: JSON.stringify(params)
            }
        };
        if (params && params.workingPath){
            options.cwd = params.workingPath;
        };
        if (Frame.debugMode && process.debugPort){
            options.execArgv = ["--inspect-brk=" + (parseInt(process.debugPort) + Math.floor(Math.random()*1000))];
        }
        var cp = ChildProcess.fork(Frame.ilabPath + "Frame.js", args, options);
        cp.id = params.id;
        cp.path = params.path;
        cp.code = Frame.STATUS_NEW;
        process.emit("child-starting", cp);
        cp.once("exit", function(){
            cp.code = Frame.STATUS_EXITED;
            process.emit('child-exited', cp);
        });
        cp.on("error", function(err){
            cp.code = Frame.STATUS_ERROR;
            process.emit('child-error', cp, err);
        });
        cp.on("message", (obj) => {
            if (typeof obj == "object"){
                Frame.send(obj);
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
                        cp.code = Frame.STATUS_STARTED;
                        cp.emit('started', cp, obj);
                        process.emit("child-started-" + cp.id, cp, obj);
                        process.emit("child-started", cp, obj);
                        return;
                    }
                    if (obj.state == "loaded") {
                        cp.code = Frame.STATUS_LOADED;
                        cp.emit('loaded', cp, obj);
                        process.emit("child-loaded-" + cp.id, cp, obj);
                        process.emit("child-loaded", cp, obj);
                        return;
                    }
                    if (obj.state == "connected") {
                        cp.code = Frame.STATUS_WORKING;
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
            cp.code = Frame.STATUS_STOPPING;
            cp.send("EXIT-REQUEST");
            //console.log("process-exit:EXIT-REQUEST");
            var exitTimeout = setTimeout(function(){
                if (!exited){
                    Frame.log("killing: " + cp.id + " KILLED BY TIMEOUT!");
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
        Frame.childs.push(cp);
        return cp;
    }

    Frame.getChild = function(childId){
        return Frame.childs.find(c => c.id == childId);
    };

    Frame.stopChild = function(childId){
        if (childId){
            var cp = Frame.getChild(childId);
            if (cp){
                cp.exit();
                return cp;
            }
        }
        return null;
    };

    return Service.apply(this, arguments);
}

Inherit(ForkingService, Service, {
    startServiceAsync : function(params){
        var self = this;
        var promise = new Promise((resolve, reject) =>{
            if (!params || !params.id) {
                reject("Trying to start service without id");
                return;
            }
            try {
                var serviceId = params.id;
                var service = Frame.getChild(serviceId);
                if (service && this.isServiceLoaded(serviceId)){
                    if (service.code == ForkMon.STATUS_WORKING) {
                        reject("Service already working");
                        return;
                    }
                }
                else{
                    service =  Frame.startService(params);
                    if (!service){
                        reject("Can not find service " + serviceId);
                        return;
                    }
                }
                process.once("child-started-" + service.id, (service, message)=>{
                    resolve(service);
                });
            }
            catch (err){
                reject(err);
            }
        });
        return promise;
    },

    stopServiceAsync : function(serviceId, params){
        var self = this;
        var promise = new Promise((resolve, reject) => {
            try {
                if (!this.isServiceLoaded(serviceId)) return reject("Service " + serviceId + " not loaded");
                var service = Frame.stopChild(serviceId);
                service.once("exited", () => {
                   resolve(serviceId + " stopped");
                });
                console.log("Stopping service " + serviceId);
            }
            catch (err){
                reject(err);
            }
        });
        return promise;
    },

    getServicesInfo : function(){
        var services = [{
            id: Frame.serviceId,
            path: Frame.nodePath,
            name: Frame.nodeName,
            serviceType: Frame.serviceType,
            type: "self",
            state: Service.STATUS_WORKING,
            status: Service.States[Service.STATUS_WORKING]
        }];
        for (var cp of Frame.childs){
            services.push({
                id: cp.id,
                path: cp.path,
                name: cp.name,
                type: "child",
                serviceType: cp.serviceType,
                state: cp.code,
                status: Frame.States[cp.code],
            });
        }
        return services;
    },

    getProxy : function(serviceId, callback){
		if (this.isServiceAvailable(serviceId)){
			var proxy = new ServiceProxy();
			if (typeof callback == "function"){
				proxy.attach(this.services[serviceId].port, "localhost", callback);
                return proxy;
			}
            return proxy.attach(this.services[serviceId].port, "localhost");
		}
		return null;
    },

	isServiceAvailable: function(id){
        var service = Frame.getChild(id);
		return service && service.code == ForkMon.STATUS_WORKING;
	},

	isServiceLoaded: function(id){
        var service = Frame.getChild(id);
		return service && service.code > Frame.STATUS_STOPPING;
	}
});

module.exports = ForkingService;