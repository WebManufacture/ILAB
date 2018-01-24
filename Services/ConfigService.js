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
        var newStore = JSON.parse(fs.readFileSync(Path.resolve("./config.json"), 'utf8'));;
        var self = this;
        if (doCheck){
            let servicesToStart = [];
            for (const serviceId in newStore){
                let config = self.store[serviceId];
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
                        servicesToStart.push(serviceId);
                        break;
                    }
                }

                if (Object.keys(config).length){
                    if (servicesToStart.indexOf(serviceId) < 0) {
                        servicesToStart.push(serviceId);
                    }
                }

                delete self.store[serviceId];
            }
            for (const serviceId in self.store){
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
        this.store = JSON.parse(fs.readFileSync(Path.resolve("./config.json"), 'utf8'));
        return serviceId ? this.store[serviceId] : this.store;
    }
});

module.exports = ConfigService;
