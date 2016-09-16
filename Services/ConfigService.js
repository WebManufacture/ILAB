/**
 * Created by osemch on 16.09.16.
 */
var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

useModule("Utils.js");
useModule("Channels.js");
var Logger = useModule('Logger.js');
useModule('Async.js');

function ConfigService(parentNode){
    ConfigService.super_.apply(this, arguments);

    this.store = {};

    this.GetConfig = function (serviceName) {
        return this.store
    };

    this.SaveConfig = function (serviceName, data) {

    };

    this.load();
};

global.ConfigService.Type = "configService";

Inherit(ConfigService, ServiceNode, {

    configure : function(config){
        if (ConfigService.base.configure){
            return ConfigService.base.configure.apply(this, arguments);
        }
        this.paths = config.Paths;
        if (!this.paths) this.paths = {};
        if (!this.paths.BasePath) this.paths.BasePath = ".";
        this.basePath = this.paths.BasePath;
    },

    load : function(){
        var result = true;
        if (ConfigService.base.load){
            result = ConfigService.base.load.apply(this, arguments);
        }
        return result
    }
});

module.exports = FileConfigService;
