var fs = require('fs');
var Path = require('path');
var stream = require('stream');
var net = require('net');
var EventEmitter = require('events');
var os = require("os");
var JsonSocket = useModule('jsonsocket');
var ChildProcess = require('child_process');
var util = useModule('utils');
var ForkMon = useModule("forkmon");
var Service = useRoot("System/Service");
var ServiceProxy = useRoot("System/ServiceProxy");

function ServicesManager(config, portCountingFunc){
    this.debugMode = config.debugMode;
	this.services = {};
	this.params = {};
    var self = this;
    this.forksCount = 0;
    if (typeof portCountingFunc != "function"){
        this._availablePort = Frame.servicePort;
        portCountingFunc = function () {
            return self._availablePort++;
        }
    }
    this._getPort = portCountingFunc;

    this.StartServiceStream = function (service) {
        if (!service) return null;
        console.log("Starting service stream:", service);
        service = self.startServiceStream(service);
        if (service){
            return new Promise((resolve, reject) => {
                if (service.servicePipe) {
                    var socket = net.connect(service.servicePipe, () => {
                        console.log("StartServiceStream connected to ", service.servicePipe);
                        resolve(socket);
                    });
                } else {
                    service.once("service-loaded", (id, params)=> {
                        if (params && params.servicePipe) {
                            var socket = net.connect(params.servicePipe, () => {
                                console.log("StartServiceStream lazy connected to ", params.servicePipe);
                                resolve(socket);
                            });
                        } else {
                            reject("service " + id + " not have a service pipe");
                        }
                    });
                }
            });
        }
        return service;
    };

    this.StartService = function (service) {
        if (!service) return null;
        console.log("Starting service:", service);
        return self.startServiceAsync(service.id, service).then(function (service) {
            return service.description;
        });
    };
    this.StartServices = function (services) {
        if (!services) return null;
        var index = 0;
        function startNext(resolve, reject) {
            var service = services[index];
            if (service && index < services.length){
                self.startServiceAsync(service.id, service).then((service, serviceId, params, serviceType)=>{
                    startNext(resolve, reject);
                }).catch((error)=>{
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
    this.StopService = function (serviceId, params) {
        return self.stopServiceAsync(serviceId, params).then(function (result) {
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
            }).then((service, serviceId, config, description) => {
                return description;
            });
        } else {
            return self.startServiceAsync(serviceId, params).then((service, serviceId, config, description) => {
                return description;
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
    this.GetServices = function (showAdwancedInfo) {
        return new Promise(function(resolve, reject){ resolve(showAdwancedInfo ? self.getServicesAdvancedInfo(): self.getServicesInfo()) });
    };
    this.GetServicesInfo = function () {
        return new Promise(function(resolve, reject){ resolve(self.getServicesAdvancedInfo()); });
    };
    this.GetService = function (name) {
        return new Promise(function(resolve, reject){
            var proxy = self.getProxy(name);
            if (!proxy){
                reject("Service " + name + " not found!");
            }
            resolve(proxy);
        });
    };
    this.CreateFork = function(id, port, options){
        if (!id){
            return;
        }
        if (typeof options != "object") options = {};
        options.serviceId = id;
        options.servicePort = port;
        options.managerPort = self.port;
        if (!options.debugMode){
            options.debugMode = self.debugMode;
        }
        if (options && (options.debugMode || options.debugPort)) {
            options.debugMode = options.debugMode ? options.debugMode : "inspect";
            if (!options.debugPort){
                options.debugPort = config.debugPort ? config.debugPort + self.forksCount + 1 :  port + 1;
            }
            //console.log("Debugger activated on " + options.debugPort);
        }
        options.servicePipe = (os.type() == "Windows_NT" ? '\\\\?\\pipe\\' : '/tmp/ilab-3-') + require('uuid/v4')();
        options.serviceId = id;
        var mon = new ForkMon(Frame.ilabPath + "/Frame.js", [], options);
        self.forksCount++;
        mon.serviceId = id;
        mon.port = port;
        mon._messageEvent = self._messageEvent;
        self._subscribeEvents(mon);
        return mon;
    };

    //For system use! Do not use this method;
    this.Pipe = function(serviceId){
        return new Promise(function(resolve, reject){
            //resolve(process.stdout);
            reject('For system use! Do not use this method;');
        });
    };

    this.on("error", function () {

    });

    return Service.apply(this, arguments);
}

ServicesManager.serviceId = "ServicesManager";

Inherit(ServicesManager, Service, {
    _subscribeEvents : function(service){
        var self = this;
        function subEvent(eventName){
            return function(arg1, arg2) {
                self.emit.call(self, "service-" + eventName, service.serviceId, arg1, arg2);
            }
        }
        service.on("error", subEvent("error"));
        service.on("message", subEvent("message"));
        service.on("service-started", function() {
            self.emit("service-started", arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
        });
        service.on("service-loaded", subEvent("loaded"));
        service.on("service-connected", subEvent("connected"));
        service.on("exited", subEvent("exited"));
    },

    _messageEvent : function(obj, msg){
        if (typeof obj == "object"){
            if (obj.type == "error"){
                if (obj.item) {
                    return this.emit("error", new Error(obj.item + ""));
                } else {
                    return this.emit("error", new Error(obj.message));
                }
            }
            if (obj.type == "log"){
                return  this.emit("message", obj.item);
            }
            if (obj.type == "control" && obj.state == "started"){
                //console.log("message - started", obj);
                return this.emit("service-started", obj.serviceId, obj.config, obj.description);
            }
            if (obj.type == "control" && obj.state == "loaded"){
                return this.emit("service-loaded", obj.serviceId, obj);
            }
            if (obj.type == "control" && obj.state == "connected"){
                return this.emit("service-connected", obj.serviceId);
            }
        }
        this.emit("message", obj);
    },

    startServiceStream : function(service){
        var self = this;
        if (!service) {
            return null;
        }
        if (!service.path){
            service.path = service.id;
        }
        var serviceId = service.id;
        if (service.id) {
            if (service.id == "auto") {
                serviceId = service.id = require('uuid/v4')();
            } else {
                serviceId = service.id;
            }
        } else {
            if (serviceId) {
                service.id = serviceId;
            }
            else {
                if (!service.id || service.id == "auto") {
                    service.id = require('uuid/v4')();
                }
                serviceId = service.id;
            }
        }
        //console.log("Starting " + serviceId);
        var serviceInstance = self.startService(serviceId, service);
        if (serviceInstance) {
            return serviceInstance;
        }
        return null;
    },

    startServiceAsync : function(serviceId, params, returnStream){
        var self = this;
        if (!params) params = {};
        if (!params.path){
            params.path = serviceId;
        }
        if (params && params.id) {
            if (params.id == "auto") {
                serviceId = params.id = require('uuid/v4')();
            } else {
                serviceId = params.id;
            }
        } else {
            if (serviceId) {
                params.id = serviceId;
            }
            else {
                if (!params.id || params.id == "auto") {
                    params.id = require('uuid/v4')();
                }
                serviceId = params.id;
            }
        }
        this.params[serviceId] = params;
        //console.log("Starting " + serviceId);
        var promise = new Promise((resolve, reject) =>{
            try {
                if (this.isServiceLoaded(serviceId)){
                    service = this.services[serviceId];
                    if (service.code < ForkMon.STATUS_WORKING) {
                        service.once("service-started", function (serviceId, config, description) {
                            service.removeListener("error", reject);
                            resolve(service, serviceId, config, description);
                        });
                        service.once("error", reject);
                        service.start(params);
                    }
                    else{
                        reject("Service already working");
                    }
                }
                else{
                    var service = self.startService(serviceId, params, function (serviceId, config, description) {
                        service.removeListener("error", reject);
                        resolve(service, serviceId, config, description);
                    });
                    if (service) {
                        service.once("error", reject);
                    } else {
                        reject("Can not find service " + serviceId);
                    }
                }
            }
            catch (err){
                if (service) {
                    service.removeListener("error", reject);
                }
                reject(err);
            }
        });
        return promise;
    },

    stopServiceAsync : function(serviceId, params){
        var self = this;
        var promise = new Promise((resolve, reject) => {
            try {
                if (!this.isServiceLoaded(serviceId)) return reject("Service " + serviceId + " not available");
                var service = this.services[serviceId];
                //if (service.code < ForkMon.STATUS_WORKING) return reject("Service not working");
                service.once("exited", ()=>{
                   resolve(serviceId + " stopped");
                });
                console.log("Stopping service " + serviceId);
                this.services[serviceId].stop();
            }
            catch (err){
                reject(err);
            }
        });
        return promise;
    },

    startService : function(serviceId, params, callback){
        if (!serviceId) return;
        var self = this;
		if (typeof params == "function") {
			callback = params;
			params = {};
		}
        function startService(service) {
            if (service.code < ForkMon.STATUS_WORKING) {
                return service.start(params);
            }
            else{
                this.emit("error", new Error("Service " + serviceId + " already work!"));
            }
        }
        if (!this.isServiceLoaded(serviceId)) {
            var env = {
                cwd : process.cwd(),
                managerPort : self.port
            };
            var servicePath = serviceId;
            if (params && params.path) {
                servicePath = params.path;
            }
            if (servicePath.indexOf("http://") != 0 && servicePath.indexOf("https://") != 0){
                if (servicePath.indexOf(".js") != servicePath.length - 3) {
                    servicePath += ".js";
                }
                if (servicePath.indexOf("/") < 0 && servicePath.indexOf("\\") < 0) {
                    servicePath = Path.resolve(Frame.ServicesPath + servicePath);
                }
                else {
                    servicePath = Path.resolve(servicePath);
                }
            }
            env.nodePath = servicePath;
            params._internalPort = self._getPort();
            var service = this.CreateFork(serviceId, params._internalPort, env);
            service.once("service-started", function (newServiceId, serviceParam, description) {
                serviceId = newServiceId;
                service.resultId = newServiceId;
                service.serviceType = description.serviceType;
                service.description = description;
                service.codePath = description.codePath;
                service.config = serviceParam;
                if (description.tcpPort){
                    service.port = description.tcpPort;
                }
                self.services[serviceId] = service;
                if (typeof callback == "function"){
                    callback.call(service, serviceId, serviceParam, description);
                }
            });

            service.once("service-loaded", function (serviceId, params) {
               // console.log("Service loaded", serviceId, params);
                if (params.servicePipe) {
                    service.servicePipe = params.servicePipe;
                }
            });

            service.on("error", function(err){
                err.serviceId = serviceId;
                self.emit("error", err);
            });
            startService(service);
			/*fs.stat(servicePath, function(err, stats){
                if (!err){
                    startService(service);
                }
                else{
                   self.emit("error", new Error("Service " + serviceId + " open error! " + err));
                }
            });*/
            return service;
        }
        else{
            startService(this.services[serviceId]);
            return this.services[serviceId];
        }
    },

    startNode : function(nodeId, nodePath, params, callback){
        if (!nodeId) return;
        var self = this;
        if (typeof params == "function") {
            callback = params;
            params = null;
        }
        function startNode(nodeFork) {
            if (nodeFork.code < ForkMon.STATUS_WORKING) {
                nodeFork.start(params);
            }
            else{
                this.emit("error", new Error("Node " + nodeId + " already work!"));
            }
        }
        if (!this.isServiceLoaded(nodeId)) {
            var env = { managerPort : self.port, nodePath: nodePath};
            if (params){
                for (var item in params){
                    env[item] = params[item];
                }
            }
            if (nodePath.indexOf(".js") != nodePath.length - 3){
                nodePath += ".js";
            }
            var fork = new ServiceFork(nodeId, Frame.getPort(), env);
            if (typeof callback == "function"){
                fork.once("service-started", function () {
                    callback.call(fork, nodeId);
                });
            }
            fork.on("error", function(err){
                err.nodeId = nodeId;
                self.emit("error", err);
            });
            fs.stat(nodePath, function(err, stats){
                if (!err){
                    startNode(fork);
                }
                else{
                    self.emit("error", new Error("Service " + nodePath + " open error! " + err));
                }
            });
        }
        else{
            startNode(this.services[nodeId]);
        }

        return service;
    },

    stopService : function(serviceId) {
        if (this.isServiceLoaded(serviceId)) {
            this.services[serviceId].stop();
        }
    },

	getContract : function(serviceName){
		var me = this;
		if (this.IsServiceLoaded(serviceName)){
			return this.services[serviceName].getContract();
		}
		return null;
	},

	getServicesInfo : function(){
        var services = { "ServicesManager" : this.port };
        for (var name in this.services){
            if (this.services[name] != null){
                services[name] = this.services[name].port;
            }
        }
        return services;
	},

    getServicesAdvancedInfo : function(){
        var services = [{
            id: this.id,
            path: Frame.nodePath,
            serviceType: "ServicesManager",
            resultId : this.serviceId,
            port: this.port,
            type: "internal",
            state: Service.STATUS_WORKING,
            status: Service.States[Service.STATUS_WORKING]
        }];
        for (var name in this.services){
            var service = this.services[name];
            if (service){
                var info = {
                    id: name,
                    path: service.codePath,
                    serviceType: service.resultType ? service.resultType : service.serviceType,
                    resultId: service.resultId,
                    status: Service.States[service.code],
                    port: service.port,
                    type: "service",
                    state: service.code,
                    config: service.config,
                    framePath: service.path,
                    description: service.description
                };
                //console.log(info)
                services.push(info);
            }
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

	isServiceAvailable : function(name){
		return (this.isServiceLoaded(name) && this.services[name].code == ForkMon.STATUS_WORKING);
	},

	isServiceLoaded : function(name){
		return typeof this.services[name] == "object";
	}
});

module.exports = ServicesManager;
