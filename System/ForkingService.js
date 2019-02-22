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

useSystem('ForkManager');

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
    return Service.apply(this, arguments);
}

Inherit(ForkingService, RoutingService, {

});

module.exports = ForkingService;