var fs = useSystem('fs');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
var os = useSystem("os");
var ChildProcess = useSystem('child_process');
var util = useModule('utils');
var ForkMon = useModule("forkmon");
var Service = useRoot("System/Service");
var ServiceProxy = useRoot("System/ServiceProxy");

function ServicesManager(portCountingFunc){
	this.services = {};
    var self = this;
    if (typeof portCountingFunc != "function"){
        this._availablePort = Frame.servicePort;
        portCountingFunc = function () {
            return self._availablePort++;
        }
    }
    this.getPort = portCountingFunc;
    this.StartService = function (serviceId, params) {
        return self.startServiceAsync(serviceId, params).then(function () {
            return serviceId + " started";
        });
    };
    this.StopService = function (serviceId, params) {
        return self.stopServiceAsync(serviceId, params).then(function () {
            return serviceId + " stopped";
        });
    };
    this.GetServices = function () {
        return new Promise(function(resolve, reject){ resolve(self.getServices()) });
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
        var mon = new ForkMon(Frame.ilabPath + "/System/ServiceFrame.js", null, options);
        mon.serviceId = id;
        mon.port = port;
        mon._messageEvent = self._messageEvent;
        self._subscribeEvents(mon);
        return mon;
    };

    return Service.apply(this, arguments);
}

ServicesManager.serviceId = "ServicesManager";

Inherit(ServicesManager, Service, {
    _subscribeEvents : function(service){
        var self = this;
        function subEvent(eventName){
            return function(arg) {
                self.emit.call(self, "service-" + eventName, service.serviceId, arg);
            }
        }
        service.on("error", subEvent("error"));
        service.on("message", subEvent("error"));
        service.on("service-started", function(arg) {
            self.emit.call(self, "service-started", service.serviceId, service.port);
        });
        service.on("service-loaded", subEvent("loaded"));
        service.on("service-connected", subEvent("connected"));
        service.on("exited", subEvent("exited"));
    },

    _messageEvent : function(obj, msg){
        if (typeof obj == "object"){
            if (obj.type == "error"){
                return this.emit("error", new Error(obj.item + ""));
            }
            if (obj.type == "log"){
                return  this.emit("message", obj.item);
            }
            if (obj.type == "control" && obj.state == "started"){
                return this.emit("service-started");
            }
            if (obj.type == "control" && obj.state == "loaded"){
                return this.emit("service-loaded");
            }
            if (obj.type == "control" && obj.state == "connected"){
                return this.emit("service-connected");
            }
        }
        this.emit("message", obj);
    },

    startServiceAsync : function(serviceId, params){
        var self = this;
        var promise = new Promise((resolve, reject) =>{
            try {
                if (this.isServiceLoaded(serviceId)){
                    service = this.services[serviceId];
                    if (service.code < ForkMon.STATUS_WORKING) {
                        service.once("service-started", function () {
                            service.removeListener("error", reject);
                            resolve(service, serviceId, params);
                        });
                        service.once("error", reject);
                        service.start();
                    }
                    else{
                        reject("Service already working");
                    }
                }
                else{
                    var service = self.startService(serviceId, params, function () {
                        service.removeListener("error", reject);
                        resolve(service, serviceId, params);
                    });
                    service.once("error", reject);
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
                if (!this.isServiceAvailable(serviceId)) return reject("Service not available");
                var service = this.services[serviceId];
                if (service.code < ForkMon.STATUS_WORKING) return reject("Service not working");
                service.once("exited", ()=>{
                   resolve(serviceId + " stopped");
                });
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
			params = null;
		}
        function startService(service) {
            if (service.code < ForkMon.STATUS_WORKING) {
                service.start();
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
			if (params){
				for (var item in params){
					env[item] = params[item];
				}
				env.params = JSON.stringify(params);
			}
            var servicePath = serviceId;
            if (params && params.path) {
                if (params.path.indexOf("http://") == 0 || params.path.indexOf("https://") == 0){
                    servicePath = params.path;
                }
                else {
                    servicePath = Path.resolve(params.path);
                }
            }
            else {
                if (servicePath.indexOf(".js") != servicePath.length - 3) {
                    servicePath += ".js";
                }
                servicePath = Path.resolve(Frame.ServicesPath + servicePath);
            }
            env.nodePath = servicePath;
            var service = this.CreateFork(serviceId, self.getPort(), env);
            service.once("service-started", function () {
                self.services[serviceId] = service;
                if (typeof callback == "function"){
                    callback.call(service, serviceId);
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
        }
        else{
            startService(this.services[serviceId]);
        }

        return service;
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
                nodeFork.start();
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
        if (this.isServiceAvailable(serviceId)) {
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

	getServices : function(){
        var services = { "ServicesManager" : this.port };
        for (var name in this.services){
            if (this.services[name] != null){
                services[name] = this.services[name].port;
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