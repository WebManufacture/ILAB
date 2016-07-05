var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

useModule("Utils.js");
useModule("Channels.js");
var Logger = useModule('Logger.js');
useModule('Async.js');

function FilesService(parentNode){
	FilesService.super_.apply(this, arguments);
};
	
Inherit(FilesService, ServiceNode, {
	_formatPath : function(fpath){
		fpath = fpath.replace(/\//g, "\\");
		if (!fpath.start("\\")) fpath = "\\" + fpath;
		fpath = this.basePath + fpath;
		fpath = fpath.replace(/\//g, "\\");
		if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
		return fpath.toLowerCase();
	},

	configure : function(config){
		this.paths = config.Paths;
		if (!this.paths) this.paths = {};
		if (!this.paths.BasePath) this.paths.BasePath = ".";
		this.basePath = this.paths.BasePath;
	},

	load : function(){
		var result = true;
		if (FilesService.base.load){
			result = FilesService.base.load.apply(this, arguments);
		}		
		return result
	},
	
	start : function(){
		var serv = this;
		if (this.HTTPServer && this.HTTPport){
			this.HTTPServer.listen(this.HTTPport, function(){
				serv.logger.info("Static server v 1.0 on " + serv.HTTPhost + ":" + serv.HTTPport);
				serv.State = Node.States.WORKING;
			});
			this.HTTPServerWorking = true;
		}
		else{
			return true;
		}
		return true;
	},

	stop : function(){
		var serv = this;
		if (this.HTTPServer){
			this.HTTPServer.close(function(){
				serv.State = Node.States.STOPPED;
			});
			this.HTTPServerWorking = false;
		}
		else{
			return true;
		}
		return false;
	},
	
	unload : function(){
		if (this.HTTPServer){
			if (this.HTTPServerWorking){
				this.HTTPServer.close();
			}
			this.HTTPServer = null;
		}
		if (this.channel){
			Channels.un(this.channel, this.ProcessContext);
		}
		this.watcher.close();
		this.watcher = null;
		return true;
	},
	
	read : function(fpath, message){	
		fpath = this.FormatPath(context.pathTail);
		var ext = paths.extname(fpath);		
		var extention = ext = ext.replace(".", "");
		ext = MimeTypes[ext];
		if (!ext){
			context.setHeader("Content-Type", "text/plain; charset=utf-8");
		}
		else{
			context.setHeader("Content-Type", ext);	    
		}
		ext = 'binary';
		var router = this;
		fs.readFile(paths.resolve(fpath), ext, function(err, result){
			if (err){
				context.finish(500, "File " + fpath + " read error " + err);
				return;
			}		
			//var buf = new Buffer(result);
			if (result.length < 1000000){
				context.setHeader("Content-Length", result.length);
			}	
			fpath = paths.resolve(fpath);
			if (typeof (processCallback) == "function"){
				var pobj = {content: result, ext: extention, encoding : ext, mime: context.res.getHeader("Content-Type"), statusCode : 200, req : context.req, res: context.res, context : context, fpath : fpath};
				try{
					var fresult = processCallback(pobj);
					if (!fresult){
						return;
					}
				}
				catch(err){
					console.error(err);
					console.log(processCallback + "");
					context.finish(500, JSON.stringify(err), ext);
					context.continue();
					return;
				}
			}
			context.finish(200, result, ext);		
			context.continue();
		});	
		return false;
	},

	browse : function(context){
		if (context.completed) return true;
		var fpath = this.FormatPath(context.pathTail);
		fs.readdir(paths.resolve(fpath), function(err, files){
			if (err){
				context.finish(500, "readdir " + fpath + " error " + err);
				return;
			}
			context.setHeader("Content-Type", "application/json; charset=utf-8");
			for (var i = 0; i < files.length; i++){
				var fname = files[i];			
				files[i] = fs.statSync(fpath + "\\" + fname);
				files[i].name = fname;
				files[i].fileType = files[i].isDirectory() ? "directory" : files[i].isFile() ? "file" : "unknown";
			}
			context.finish(200, JSON.stringify(files));
			context.continue();
		});
		return false;
	},

	del : function(context){
		if (context.completed) return true;
		var fpath = this.FormatPath(context.pathTail);
		var files = this;
		fs.exists(paths.resolve(fpath), function(exists){
			if (!exists){
				context.finish(404, "file " + fpath + " not found");
				return;
			}
			info("Deleting " + fpath);
			fs.unlink(fpath, function(err, result){
				if (err){
					Channels.emit("/file-system." + files.instanceId + "/action.delete.error", fpath.replace(files.basePath, ""), err, files.basePath);
					context.finish(500, "Delete error " + fpath + " " + err);	
					context.continue();
					return;
				}			
				Channels.emit("/file-system." + files.instanceId + "/action.delete", fpath, files.instanceId,files.basePath );
				context.finish(200, "Deleted " + fpath.replace(files.basePath, ""));			
				context.continue();
			});
		});
		return false;
	},

	write : function(context){
		if (context.completed) return true;
		var fpath = this.FormatPath(context.pathTail);
		var fullData = "";
		//console.log("updating cache: " + fpath + " " + this.LastFiles[fpath]);
		var files = this;
		var writeFunc = function(){
			info("Writing " + fpath);
			fs.writeFile(paths.resolve(fpath), fullData, 'utf8', function(err, result){
				if (err){
					context.finish(500, "File " + fpath + " write error " + err);
					Channels.emit("/file-system." + files.instanceId + "/action.write", fpath.replace(files.basePath, ""), err, files.basePath);
					return;
				}
				Channels.emit("/file-system." + files.instanceId + "/action.write", fpath.replace(files.basePath, ""), files.instanceId, files.basePath);
				context.finish(200);
				context.continue();
			});	
		}
		if (context.data == undefined){
			context.req.on("data", function(data){
				fullData += data;		
			});
			context.req.on("end", writeFunc);
		}
		else{
			fullData = context.data;
			writeFunc();
		}
		return false;
	}


});

module.exports = FilesService;

