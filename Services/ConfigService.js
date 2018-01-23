/**
 * Created by osemch on 16.09.16.
 */
var fs = useSystem('fs');
var Path = useSystem('path');
var http = useSystem('http');
var EventEmitter = useSystem('events');
var Service = useRoot("/System/Service.js");

function ConfigService(params){
    if (!params) params = {};
    ConfigService.super_.apply(this, arguments);

    var self = this;

    this.store = {};

    this.loadStore();

    this.GetConfig = function (serviceId) {
        return this.store[serviceId];
    };

    this.SaveConfig = function (serviceId, data, restartService) {
        this.store[serviceName] = data;
        var promise = new Promise(function (resolve, reject) {
            fs.writeFile(Path.resolve("./config.json"), JSON.stringify(this.store), function (err) {
                if (err){
                    reject(err);
                }
                resolve(data);
            });
        });
        if (restartService){
            return promise.then(function () {
                return ServicesManager.ResetService(serviceName);
            })
        };
        return promise;
    };

    this.filesServiceId = params.filesServiceId ? params.filesServiceId: "FilesService";
    if (params.watchConfigFile) {
        ServicesManager.GetService(self.filesServiceId).then((filesService) => {
            if (filesService) {
                filesService.Watch("./config.json", false).then((fpath) => {
                    filesService.on("watch:" + fpath, (change, path) => {
                        console.log(change + " in path " + path);
                        if (change == "change") {
                            self.reloadStore(true, true);
                        }
                    });
                    console.log("Watching ./config.json");
                }).catch((err) => {
                    console.log("Can't watch ./config.json!");
                    console.log(err);
                });
            } else{
                console.log(filesService);
            }
        }).catch(function (err) {
            console.error("ConfigService: Can't get service " + self.filesServiceId);
        });
    }
};

global.serviceId = "ConfigService";

Inherit(ConfigService, Service, {

    reloadService(id){

    },

    reloadStore(doCheck, doReload){
        var newStore = require(Path.resolve("./config.json"));
        var self = this;
        if (doCheck){
            let servicesToStart = [];
            for (const serviceId in newStore){
                let config = this.store[serviceId];
                let newConfig = newStore[serviceId];
                if (config === undefined){
                    //console.log("")
                    servicesToStart.push(serviceId);
                    continue;
                }

                for (const configKey in newConfig) {
                    var value = config[configKey];
                    delete config[configKey];
                    if (newConfig[configKey] != value){
                        ServicesManager.StopService(serviceId);
                        servicesToStart.push(serviceId);
                        break;
                    }
                }

                if (Object.keys(config).length){
                    ServicesManager.StopService(serviceId);
                    servicesToStart.push(serviceId);
                }

                delete this.store[serviceId];
            }
            for (const serviceId in this.store){
                ServicesManager.StopService(serviceId);
            }
            self.loadStore();
            function restartService() {
                if (servicesToStart[0]) {
                    ServicesManager.StartService(serviceId, self.store[serviceId]).then(() => {
                        servicesToStart.shift();
                        restartService();
                    });
                }
            }
            if (servicesToStart.length) {
                restartService();
            }
            return;
        }
        self.loadStore();
    },

    configure : function(config){
        if (ConfigService.base.configure){
            return ConfigService.base.configure.apply(this, arguments);
        }
        this.paths = config.Paths;
        if (!this.paths) this.paths = {};
        if (!this.paths.BasePath) this.paths.BasePath = ".";
        this.basePath = this.paths.BasePath;
    },

    loadStore : function(serviceId){
        this.store = require(Path.resolve("./config.json"));
        return serviceId ? this.store[serviceId] : this.store;
    }
});

module.exports = ConfigService;
