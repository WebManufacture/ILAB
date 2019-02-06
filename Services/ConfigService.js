/**
 * Created by osemch on 16.09.16.
 */
var fs = require('fs');
var Path = require('path');
var http = require('http');
var EventEmitter = require('events');
var Service = useSystem("Service.js");

function ConfigService(params) {
    if (!params) params = {};
    ConfigService.super_.apply(this, arguments);

    var self = this;

    this.store = {};

    this.loadStore();

    this.GetConfig = function (serviceId) {
        return this.store[serviceId];
    };

    this.GetConfigs = function (serviceId) {
        return this.store;
    };

    this.SaveConfig = function (serviceName, data, restartService) {
        this.store[serviceName] = data;
        var promise = this.Save(data);
        if (restartService) {
            return promise.then(function () {
                return ServicesManager.ResetService(serviceName).catch(err => {});
            })
        };
        return promise;
    };

    this.Save = function (data) {
        return new Promise(function (resolve, reject) {
            fs.writeFile(Path.resolve("./config.json"), JSON.stringify(self.store), function (err) {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
        });
    };

    this.filesServiceId = params.filesServiceId ? params.filesServiceId : "FilesService";
    ServicesManager.GetService(self.filesServiceId).then((filesService) => {
        if (filesService) {
            self.filesService = filesService;
            if (params.watchConfigFile) {
                filesService.Watch("config.json", false).then((fpath) => {
                    filesService.on("watch:" + fpath, (change, path) => {
                        if (change == "change") {
                            self.reloadStore(true, true);
                        }
                    });
                    console.log("Watching config.json");
                }).catch((err) => {
                    console.log("Can't watch config.json!");
                    console.log(err);
                });
            }

            if (params.watchServicesPaths) {
                for (var serviceId in self.store) {
                    if (serviceId != "ServicesManager" && serviceId != "RootService") {
                        self.watchServiceFileChange(serviceId, self.store[serviceId]);
                    }
                }
            }

        } else {
            console.log(filesService);
        }
    }).catch(function (err) {
        console.error("ConfigService: Can't get service " + self.filesServiceId);
    });

    ServicesManager.GetServicesInfo().then((services)=>{
        services.forEach((service)=> {
            let serviceName;
            if (service.serviceType === 'ServicesManager'){
                serviceName = service.serviceType
            }else{
                serviceName = service.path;
            }
            let serviceId = service.resultId;
            if (self.store[serviceName] && self.store[serviceName].id !== serviceId){
                self.store[serviceName].id = serviceId;
                self.SaveConfig(serviceName, self.store[serviceName]).then(()=>{}).catch(()=>{})
            }
        });
    }).catch(()=>{});
}

global.serviceId = "ConfigService";

Inherit(ConfigService, Service, {

    watchServiceFileChange(serviceId, options){
        var self = this;
        var config = this.store[serviceId];
        var path = "Services/" + serviceId + ".js";
        if (config && config.path) path = config.path;
        return self.filesService.Watch(path, false).then((fpath) => {
            var changing = false;
            self.filesService.on("watch:" + fpath, (change, path) => {
                if (change == "change" && !changing) {
                    console.log("Service " + serviceId + " " + change + " in path " + path);
                    changing = true;
                    return ServicesManager.ResetService(serviceId, options).then(()=>{changing = false;}).catch(err => {changing = false;});
                }
            });
            console.log("Watching " + fpath);
        }).catch((err) => {
            console.log("Can't watch "  + path);
            console.log(err);
        });
    },

    getServiceId(serviceKey, options) {
        if (options.id) return id;
        return serviceKey;
    },

    getServiceType(serviceKey, options) {
        return serviceKey;
    },

    reloadStore(doCheck, doReload) {
        var newStore = JSON.parse(fs.readFileSync(Path.resolve("./config.json"), 'utf8'));
        var self = this;
        if (doCheck) {
            let servicesToStart = [];
            for (const serviceId in newStore) {
                let config = self.store[serviceId];
                let newConfig = newStore[serviceId];
                if (config === undefined) {
                    //console.log("")
                    servicesToStart.push(serviceId);
                    continue;
                }

                for (const configKey in newConfig) {
                    var value = config[configKey];
                    delete config[configKey];
                    if (newConfig[configKey] != value) {
                        servicesToStart.push(serviceId);
                        break;
                    }
                }

                if (Object.keys(config).length) {
                    if (servicesToStart.indexOf(serviceId) < 0) {
                        servicesToStart.push(serviceId);
                    }
                }

                delete self.store[serviceId];
            }
            for (const serviceId in self.store) {
                if (servicesToStart.indexOf(serviceId) < 0) {
                    servicesToStart.push(serviceId);
                }
            }
            self.loadStore();
            var params = [];
            servicesToStart.forEach(sid => params.push(self.store[sid]));
            ServicesManager.ResetServices(servicesToStart, params);
            return;
        }
        self.loadStore();
    },

    configure: function (config) {
        if (ConfigService.base.configure) {
            return ConfigService.base.configure.apply(this, arguments);
        }
        this.paths = config.Paths;
        if (!this.paths) this.paths = {};
        if (!this.paths.BasePath) this.paths.BasePath = ".";
        this.basePath = this.paths.BasePath;
    },

    loadStore: function (serviceId) {
        this.store = JSON.parse(fs.readFileSync(Path.resolve("./config.json"), 'utf8'));
        return serviceId ? this.store[serviceId] : this.store;
    }
});

module.exports = ConfigService;
