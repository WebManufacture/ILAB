var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

useModule("Utils.js");
useModule("Channels.js");
var Logger = useModule('Logger.js');
useModule('Async.js');

function FileConfigService(parentNode){
    FileConfigService.super_.apply(this, arguments);
};

global.FileConfigService.Type = "configService"
	
Inherit(FileConfigService, ServiceNode, {

    configure : function(config){
        if (FileConfigService.base.configure){
            return FileConfigService.base.configure.apply(this, arguments);
        }
		this.paths = config.Paths;
		if (!this.paths) this.paths = {};
		if (!this.paths.BasePath) this.paths.BasePath = ".";
		this.basePath = this.paths.BasePath;
	},

	load : function(){
		var result = true;
		if (FileConfigService.base.load){
			result = FileConfigService.base.load.apply(this, arguments);
		}		
		return result
	}
});

module.exports = FileConfigService;

