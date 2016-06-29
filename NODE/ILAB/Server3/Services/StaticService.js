var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');

useModule("Utils.js");
useModule("Channels.js");
var Files = useModule("Files.js");
var Logger = useModule('Logger.js');
useModule('Async.js');

function StaticFilesService(parentNode){
	StaticFilesService.super_.apply(this, arguments);
	this.ProcessRequest = CreateClosure(this._ProcessRequest, this);
	this.ProcessContext = CreateClosure(this._ProcessContext, this);
};

StaticFilesService.MimeTypes = {
	htm : "text/html; charset=utf-8",
	html : "text/html; charset=utf-8",
	js : "text/javascript; charset=utf-8",
	css : "text/css; charset=utf-8",
	json : "text/json; charset=utf-8",
	png : "image/png",
	gif : "image/gif",
	jpg : "image/jpeg",
	bmp : "image/bmp",
	ttf : "font/truetype; charset=utf-8"
};
	
Inherit(StaticFilesService, FilesServiceNode, {
	load : function(){
		if (StaticFilesService.base.load){
			StaticFilesService.base.load.apply(this, arguments);
		}		
		this.FilesRouter = Files(this.config, this, this.logger);
		this.LastFiles = {};
		this.LastTypes = {};
		var serv = this;
		
		if (this.config.DefaultTemplate){
			var fpath = this.config.DefaultTemplate = this.FormatPath(this.config.DefaultTemplate);
 			fs.readFile(fpath, 'utf8', function(err, result){
				if (!err){
					serv.defaultTemplate = result;
				}
			});
		};
		
		if (this.config.http){			
			var url = Url.parse(this.config.http, false);
			if (!url.port){
				url.port = 80;
			}
			this.HTTPhost = url.hostname;
			this.HTTPport = url.port;
			this.HTTPserver = http.createServer(this.ProcessRequest);			
		}
		
		if (this.config.channel){
			this.channel = this.config.channel;
			Channels.on(this.channel, this.ProcessContext);
		}
		
		//Init Watcher
		this.Map = {};
		this.mapCounter = 0;
		this.mapStart = new Date();
		this.filesCounter = 0;
		this._buildFSmap(this.Map, this.basepath, function(){
			serv.State = Node.States.LOADED;
		});
		this.logger.debug("FS Watching " + this.basepath);
		this.watcher = fs.watch(serv.basepath, {}, function(event, fname){
			if (typeof (fname) == 'string'){
				fname = serv.FormatPath(fname);
				if (serv.config.DefaultTemplate){
					serv.logger.debug(serv.config.DefaultTemplate);
					if (fname == serv.config.DefaultTemplate){
						fs.readFile(serv.config.DefaultTemplate, 'utf8', function(err, result){
							if (!err){
								serv.defaultTemplate = result;
							}
						});
						return;
					}					
				}
				delete serv.LastFiles[fname];		
				delete serv.LastTypes[fname];
			}
			else{
				serv.logger.debug("FS Watch " + (fname ? fname : "") + " event " + (event ? event : ""));
			}
		});	
		return false;
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
		return false;
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

	_process : function(context){
		var serv = this;
		var ptail = context.pathTail;
		if (serv.config.DefaultFile && (context.pathTail == "" || context.pathTail == "/")){
			ptail += serv.config.DefaultFile;
		}
		var fpath = Path.resolve(serv.FormatPath(ptail)).toLowerCase();
		var result = serv.ProcessCache(context.req, context.res, fpath, context.url.query);
		if (result > 0){
			context.finish(result)
			return true;
		}
		var tproc = null;
		if (context.req.method == "GET"){
			if (serv.Map[fpath] == "directory"){
				if (context.url.query["join"]){
					serv.ConcatDir(context.req, context.res, fpath, context.url.query);
					return false;
				}
				else{
					if (serv.defaultTemplate){	
						var pobj = {content: serv.defaultTemplate,
									ext: "htm",
									encoding : 'utf8',
									mime: MimeTypes.html,
									url : context.url,
									statusCode : 200,
									req : context.req,
									res: context.res, 
									context : context, 
									fpath : fpath};
						try{
							var fres =  serv.ProcessTemplates(pobj);
							if (fres){
								context.finish(200, serv.defaultTemplate);
							}
							return fres;
						}
						catch(err){
							console.error(err);
							context.finish(500, JSON.stringify(err), ext);
							return true;
						}
					};
					context.finish(403, "Directory is not able to list.");
					return true;
				}
			}
			if (serv.Map[fpath] == MimeTypes.html){
				tproc = CreateClosure(serv.ProcessTemplates, serv);
			}					
		}	
		result = true;
		if (typeof serv.FilesRouter[context.req.method] == "function"){
			result = serv.FilesRouter[context.req.method](context, null, null, tproc);
		}
		if (context.res.getHeader("Content-Type")){
			serv.LastTypes[fpath] = context.res.getHeader("Content-Type");
		}
		return result;
	},
	

	_ProcessContext : function(message, context){
		context.setHeader("Access-Control-Allow-Origin", "*");
		context.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		context.setHeader("Access-Control-Max-Age", "12000");		
		//context.setHeader("Content-Type", "text/plain; charset=utf-8");
		if (context.req.method == 'OPTIONS'){
			context.finish(200, "OK");	
			return true;
		}
		try{
			return this._process(context);
		}
		catch (e){
			error(e);
		}	
		return true;
	},
	
	_ProcessRequest : function(req, res){
		var url = Url.parse(req.url, true);
		var context = {
			req: req,
			res: res,
			url: url,
			method : req.method,
			etag: url.etag,
			pathTail : url.pathname,
			setHeader : function(){
				if (this.finished) return;
				return res.setHeader.apply(res, arguments);
			},
			getHeader : function(){
				if (this.finished) return;
				return req.getHeader.apply(req, arguments);
			},
			finish: function(header, body, ext){
				if (this.finished) return;
				this.finished = true;
				this.res.statusCode = header;
				this.res.end(body, ext);
			},
			"continue" : function(param){

			},
			"abort" : function(param){

			}
		};
		return this._ProcessContext(context);
	},

	ConcatDir : function(req, res, fpath, query){
		if (query["content-type"]){
			res.setHeader("Content-Type", query["content-type"] + "");
			this.LastTypes[fpath] = query["content-type"];
		}
		fs.readdir(fpath, function(err, files){
			try{
				if (err){
					res.statusCode = 500;
					res.end("readdir " + fpath + " error " + err);
					return;
				}
				var collector = new Async.Collector(files.length);
				for (var i = 0; i < files.length; i++){
					var fname = fpath + "\\" + files[i];	
					//console.log('concat ' + fname);
					collector.createParametrizedCallback(fname, function(file, callback){
						fs.stat(file, function(err, stat){
							//console.log('Stat file ' + file);
							if (err){
								callback("");
								return;
							}
							var ext = Path.extname(file);		
							ext = ext.replace(".", "");
							ext = StaticFilesService.MimeTypes[ext];
							if (stat.isFile()){
								fs.readFile(file, 'utf-8', function(err, result){
									//console.log('Read file ' + file);
									if (err){
										callback("");
										return;
									}
									callback(result);
								});
							}
							else{
								callback("");
							}
						});	
					});
				}/*
				collector.on('handler', function(param, count){
					console.log('Handler complete ' + this.count + " " + count);
				});*/
				collector.on('done', function(results){
					var result = "";
					if (query.first){
						result += query.first;
					}
					for (var i = 0; i < results.length; i++){
						if (results[i] && results[i] != ""){
							result += results[i];
							if (query.delimeter && i < results.length - 1){
								result += query.delimeter;
							}
						}
					};
					if (query.last){
						result += query.last;
					}
					res.statusCode = 200;
					res.end(result);				
				});
				collector.run();
			}
			catch(error){
				res.statusCode = 500;
				res.end(error);
				return;
			}
		});
		return false;
	},

	ProcessTemplates : function(params){
		if (params.mime == MimeTypes.html){
			var regex = /<&(\w+)([^>]*)>?(.*)<\/&\1>/ig;
			var match;
			var processed = true;
			var fb = new Async.Collector(false, function(results){
				var resNum = 0;
				var content = params.content.replace(regex, function(src){
					if (results[resNum]) return results[resNum++];
					return src;					
				});
				params.context.finish(params.statusCode, content, params.encoding);
				params.context.continue();
			});
			while ((match = regex.exec(params.content)) !== null){
				var pname = match[1];	
				var pconf = match[2];
				var pval = match[3];
				var cp = global.StaticFilesService.ContentProcessors[pname];
				if (cp){
					processed = false;
					fb.addClosureCallback(cp, this, [params, pval, pconf]);
				}
			}	
			if (!processed) fb.run();
			return processed;
		}
		return true;
	},

	ContentProcessors : {
		file : function(params, value, pconf, callback){
			var fpath = this.FormatPath(value);
			var lf = this.LastFiles[fpath];
			if (lf){
				callback(lf);
			}
			else{
				fs.readFile(fpath, 'utf8', function(err, result){
					if (err){
						callback(err);
						return;
					}
					
					callback(result);
				});
			}
		},
		
		eval : function(params, value, pconf, callback){
			try{
				var result = EvalInContext(value, this, params);
				
			}
			catch(error){
				callback(error + "");
				return;
			}
			callback(result);
		}

	},

	ProcessCache : function(req, res, fpath, query){
		var serv = this;
		if (req.method == "GET"){
			if (query["content-type"]){
				res.setHeader("Content-Type", query["content-type"] + "");
			}
			else{
				//res.setHeader("Content-Type", "text/plain; charset=utf-8");
			}
			var dnow = new Date();
			res.setHeader("Cache-Control", "max-age=3600");
			res.setHeader("Expires", new Date(dnow.valueOf() + 1000 * 3600).toString());
			var inm = req.headers["if-none-match"];
			//console.log(inm + " " + serv.LastFiles[fpath] + " " + fpath);
			var etag = serv.LastFiles[fpath]; 
			if (!etag){
				etag = (Math.random() + "").replace("0.", "");
				//console.log(etag + " " + fpath);
				serv.LastFiles[fpath] = etag;
			}
			res.setHeader("ETag", etag);
			if (etag == inm){
				if (serv.LastTypes[fpath]){
					res.setHeader("Content-Type", serv.LastTypes[fpath]);
				}
				return 304;
			}
			return 0;
		}
		if (req.method == "DELETE" || req.method == "POST" || req.method == "PUT" ){
			if (serv.config.Mode && serv.config.Mode == "ReadOnly"){
				return 403;
			}
			delete serv.LastFiles[fpath];
			delete serv.LastTypes[fpath];
		}
		return 0;
	},

	_buildFSmap : function(map, path, callback){
		var serv = this;
		serv.mapCounter++;
		path = Path.resolve(path).toLowerCase();
		fs.readdir(path, function(err, files){
			map[path] = "directory";
			serv.mapCounter--;
			if (!err){
				serv.mapCounter += files.length
				for (var i = 0; i < files.length; i++){
					var fname = files[i];	
					var fpath = path + "\\" + fname;
					serv._addEntityToMap(map, fpath, callback);
				}
			}
			else{
				serv.logger.error(err);
			}
			if (serv.mapCounter <= 0){
				if (callback) callback();
				serv.logger.info("Mapping finished " + (new Date() - serv.mapStart) + " " + serv.basepath + " " + serv.filesCounter);
			}
		});
	},
	
	_addEntityToMap : function(map, path, callback){
		var serv = this;
		path = Path.resolve(path).toLowerCase();
		process.nextTick(function(){
			fs.stat(path, function(err, stat){
				serv.mapCounter--;
				if (!err){
					if (stat.isFile()){				
						var ext = Path.extname(path);		
						ext = ext.replace(".", "");
						ext = StaticFilesService.MimeTypes[ext];
						if (!ext) ext = 'binary';
						map[path] = ext;
						serv.filesCounter++;
					}
					if (stat.isDirectory()){
						serv._buildFSmap(map, path, callback);
					}
				}
				else{
					serv.logger.error(err);
				}
				if (serv.mapCounter <= 0){
					if (callback) callback();
					serv.logger.info("Mapping finished " + (new Date() - serv.mapStart) + " " + serv.basepath + " " + serv.filesCounter);
				}
			});
		});
	}
});

module.exports = StaticFilesService;

