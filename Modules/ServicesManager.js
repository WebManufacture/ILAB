var fs = useSystem('fs');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
var os = useSystem("os");
var ChildProcess = useSystem('child_process');
var util = useModule('utils');
var ForkMon = useModule("forkmon");
var Service = useModule("Service");
var ServiceProxy = useModule('ServiceProxy');

function ServiceFork(id, port, options){
    if (!id){
        return;
    }
    this.port = port;
    if (typeof options != "object") options = {};
    options.serviceId = id;
    options.servicePort = this.port;
    return ForkMon.call(this, Frame.ServicesPath + "ServiceFrame.js", null, options);
};

Inherit(ServiceFork, ForkMon, {
    _messageEvent : function(obj, msg){
        if (typeof obj == "object" && obj.type == "error"){
            return this.emit("error", new Error(obj.item + ""));
        }
        if (typeof obj == "object" && obj.type == "log"){
            return  this.emit("message", obj.item);
        }
		if (typeof obj == "object" && obj.type == "control" && obj.state == "started"){
			return this.emit("service-started");
		}
        this.emit("message", obj);
    }
});

function ServicesManager(port){
	this.services = {};
    return Service.call(this, port, "ServicesManager");
}

Inherit(ServicesManager, Service, {

    startService : function(serviceId, params, callback){
        if (!serviceId) return;
        var self = this;
		if (typeof params == "function") {
			callback = params;
			params = null;
		}
        if (!this.isServiceLoaded(serviceId)) {
            var env = { managerPort : self.port};
			if (params){
				for (var item in params){
					env[item] = params[item];
				}
			}
            var fork = new ServiceFork(serviceId, Frame.getPort(), env);
			if (typeof callback == "function"){
				fork.once("service-started", function () {
					callback.call(fork, serviceId);
				});
			}
            fork.on("error", function(err){
                err.serviceId = serviceId;
                self.emit("error", err);
            });
			var servicePath = serviceId;
			if (servicePath.indexOf(".js") != servicePath.length - 3){
				servicePath += ".js";
			}
			servicePath = Path.resolve(Frame.ServicesPath + servicePath);
            fs.stat(servicePath, function(err, stats){
                if (!err){
                    self.services[serviceId] = fork;
                    self.startService(serviceId, params, callback);
                }
                else{
                   self.emit("error", new Error("Service " + serviceId + " open error! " + err));
                }
            });
            return fork;
        };
        var service = this.services[serviceId];
        if (service.code < ForkMon.STATUS_WORKING) {
            service.start();
        }
        else{
            this.emit("error", new Error("Service " + serviceId + " already work!"));
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
		var services = [];
		for (var s in this.services){
			if (this.services[name] != null){
				services.push(s);
			}
		}
		return services;
	},

    getProxy : function(serviceId, callback){
		if (this.isServiceAvailable(serviceId)){
			var proxy = new ServiceProxy();
			if (typeof callback == "function"){
				proxy.attach(this.services[serviceId].port, "localhost", callback);
			}
			return proxy;
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