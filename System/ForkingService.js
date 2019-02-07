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