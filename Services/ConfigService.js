/**
 * Created by osemch on 16.09.16.
 */
var fs = useSystem('fs');
var Path = useSystem('path');
var http = useSystem('http');
var EventEmitter = useSystem('events');
var Service = useRoot("/System/Service.js");

function ConfigService(parentNode){
    ConfigService.super_.apply(this, arguments);

    this.store = {};

    this.loadStore();

    this.GetConfig = function (serviceName) {
        return this.store[serviceName];
    };

    this.SaveConfig = function (serviceName, data, restartService) {
        this.store[serviceName] = data;
        var promise = new Promise(function (resolve, reject) {
            fs.writeFile(Path.resolve("./config.json"), this.store, function (err) {
                if (err){
                    reject(err);
                }
                resolve(data);
            });
        });
        if (restartService){
            return promise.then(function () {
                return ServicesManager.StopService(serviceName);
            }).then(function () {
                return ServicesManager.StartService(serviceName);
            })
        };
        return promise;
    };
};

global.serviceId = "ConfigService";

Inherit(ConfigService, Service, {

    configure : function(config){
        if (ConfigService.base.configure){
            return ConfigService.base.configure.apply(this, arguments);
        }
        this.paths = config.Paths;
        if (!this.paths) this.paths = {};
        if (!this.paths.BasePath) this.paths.BasePath = ".";
        this.basePath = this.paths.BasePath;
    },

    loadStore : function(){
        this.store = require(Path.resolve("./config.json"));
        return this.store;
    }
});

module.exports = ConfigService;
