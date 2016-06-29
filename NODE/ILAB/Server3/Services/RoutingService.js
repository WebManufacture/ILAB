var http = require('http');
var Net = require('net');
var Url = require('url');
var Path = require('path');
var Cookie = useSystem("cookies");
var httpProxy = useSystem('http-proxy');

useModule("Utils.js");
var logger = useModule("Logger.js");
useModule("Channels.js");
useModule("Router.js");
useNodeType("service");

function RoutingService(parentNode, config){
	ServiceNode.super_.apply(this, arguments);
	this.type = RoutingService.Type;
};

RoutingService.Type = "RoutingService";

Inherit(RoutingService, ServiceNode, {
	configure : function(config){
		if (RoutingService.base.configure){
			return RoutingService.base.configure.apply(this, arguments);
		}
		this.routes = {};
		if (this.lconfig.routes) {
			this.routes = this.lconfig.routes;
		}
		this.portRouters = {};
		this.defaultPort = this.lconfig.defaultport;
		if (!this.defaultPort) this.defaultPort = 80;
		if (config.HttpHeaders) this.advancedHttpHeaders = config.HttpHeaders;		
		if (config.ServiceUrl) this.serviceUrl = config.ServiceUrl;		
	},
	
	
	load : function(node){
		if (RoutingService.base.load){
			return RoutingService.base.load.apply(this, arguments);
		}
		var config = this.config;
		var routes = this.routes;
		for (var path in routes){
			var dest = routes[path];
			if (!dest) continue;
			var url = Url.parse(path, false);
			if (!url.port){
				url.port = this.defaultPort;
			}
			url.pathname = decodeURIComponent(url.pathname);
			var protocol = url.protocol = url.protocol.toUpperCase().replace(":", "");
			var portRouter = this.portRouters[url.port];
			if (!portRouter) portRouter = this.portRouters[url.port] = new RoutingService.PortRouter(url.port, this, this.parentNode);
			if (!portRouter[protocol]) {
				this.logger.warn("Unknown protocol " + protocol + " for " + path);
				continue;
			}
			portRouter[protocol](url, url.pathname, dest);
			this.logger.info("%green; " + protocol + " -> " + url.hostname + ":" + url.port + (url.pathname ? url.pathname : ""));
		}
		
		if (this.config.ChannelsTerminator){
			for (var port in this.portRouters){
				var cfg = this.portRouters[port];
				if (cfg.HttpRouters){
					for (var host in cfg.HttpRouters){
						var router = cfg.HttpRouters[host];
						router.for("Main", "/",	new RoutingService.HttpChannelsClient("/", this));
					}
				}
			}
		}		
		return true;
	},
	
	start : function(node){
		for (var port in this.portRouters){
			var config = this.portRouters[port];
			config.Start();
		}
		return true;
	},
	
	stop : function(node){
		for (var port in this.portRouters){
			var config = this.portRouters[port];
			config.Stop();
		}
		return true;
	},
	
	unload : function(node){
		var self = this;
		var lf = new Async.Waterfall(function(){
			self.State = Node.States.UNLOADED;
		});
		for (var port in this.portRouters){
			this.portRouters[port].Stop(lf.getCallback());
			delete this.portRouters[port];
		}	
		delete this.portRouters;
		lf.check();
		return false;
	},
});


RoutingService.CreateMap = function(routerMapNode){
	if (!routerMapNode) return "Undefined node";
	var mapObj = null;
	for (var item in routerMapNode){
		if (item != "//"){
			var node = routerMapNode[item];
			if (node instanceof Array){
				if (node.length > 0) {
					if (!mapObj) mapObj = {};
					if (node.length > 1) {
						mapObj[item] = [];
						for (var i = 0; i < node.length; i++)
						{
							var to = typeof(node[i]);
							if (to == "object"){
								to = (node[i]._ModuleName ? node[i]._ModuleName : "")  + "{" 
								+ (node[0].GET ? "GET," : "")
								+ (node[0].POST ? "POST," : "")
								+ (node[0].PUT ? "PUT," : "")
								+ (node[0].DELETE ? "DEL," : "")
								+ (node[0].SEARCH ? "SRCH," : "")   
								+ (node[0].HEAD ? "HEAD," : "")
								+ (node[0].OPTIONS ? "OPTS," : "");
								to = to.trim(",") + "}";
								
							}
							if (to == "function"){
								to += " " + node[i].name;
							}
							mapObj[item].push(to);
						}
					}
					else{
						var to = typeof(node[0]);
						if (to == "object"){
							to = (node[0]._ModuleName ? node[0]._ModuleName : "")  + "{" 
							+ (node[0].GET ? "GET," : "")
							+ (node[0].POST ? "POST," : "")
							+ (node[0].PUT ? "PUT," : "")
							+ (node[0].DELETE ? "DEL," : "")
							+ (node[0].SEARCH ? "SRCH," : "")   
							+ (node[0].HEAD ? "HEAD," : "")
							+ (node[0].OPTIONS ? "OPTS," : "");
							to = to.trim(",") + "}";
							
						}
						if (to == "function"){
							to += " " + node[0].name;
						}
						mapObj[item] = to;
					}
				}
			}
			else{
				var value = RoutingService.CreateMap(node);
				if (value){
					if (!mapObj) mapObj = {};
					mapObj[item] = value;
				}
			}
		}
	}
	return mapObj;
}

RoutingService.CreateChannelMap = function(channel, count){
	if (!count) count = 1;
	//if (count > 10) return null;
	if (!channel) return;
	var mapObj = null;
	for (var item in channel){
		var node = channel[item];
		if (!mapObj) mapObj = {};
		if (Array.isArray(node)){
			mapObj[item] = node.length;
		}
		else{
			if (typeof(node) == "object"){
				var value = RoutingService.CreateChannelMap(node, count + 1);
				if (value){			
					mapObj[item] = value;
				}
			}
			else{
				mapObj[item] = node;
			}
		}
	}
	return mapObj;
}

RoutingService.PortRouter = function (Port, service, owner){
	var self = this;
	self.State = "Initialize";
	var listener = Net.createServer();
	listener.on("listening", function(){
		service.logger.info("Listening " + Port + "");
		self.State = "Working";
	});
	listener.on("error", function(error){
		service.logger.error("Listener on " + Port + " " + error);
		self.State = "Error";
	});
	listener.on("close", function(){
		service.logger.info("Lister on " + Port + " closed");
		self.State = "Closed";
	});
	if (owner){
		this.owner = owner.id;
	}
	else{
		this.owner = "unknown";
	}
	//listener.listen(this.port);
	this.service = service;
	this.logger = service.logger;
	this.port = Port;
	this.TcpListener = listener;
};

RoutingService.PortRouter.prototype = {
	Start : function(){
		if (this.State != "Working"){
			this.TcpListener.listen(this.port);
		}
	},
	
	Stop : function(callback){
		if (this.State == "Working"){
			this.TcpListener.close(callback);
		}
	},
	
	HTTP : function(url, path, channel){
		if (!this.HttpRouters) this.HttpRouters = {};
		var log = this.logger;
		if (!this.HttpServer) this.HttpServer = this._createHttpServer(this.TcpListener);
		if (!url) return;
		var router = this.HttpRouters[url.hostname];
		if (!router) router = this.HttpRouters[url.hostname] = this._createHttpRouter(this.TcpListener);
		if (channel){
			this.logger.trace("Routing path: " + path + " --> " + channel);
			function RedirectToChannel(context){
				var ppath = channel + "." + context.method + context.pathTail;
				log.debug("Following " + ppath);
				Channels.emit(ppath, context);
				return false;
			}
			if (url.protocol.start('HTTP')){
				router.for("Main", path, RedirectToChannel);
			}
			else{
				var obj = {};
				obj[url.protocol] = RedirectToChannel;
				console.log(obj);
				router.for("Main", path, obj);
			}
		}
		return router;
	},
	
	HTTPCH : function(url, path, channel){
		var router = this.HTTP(url, path);
		if (channel){
			this.logger.trace("Channeling path: " + path + " --> " + channel);
			router.for("Main", path, new RoutingService.HttpChannelsClient(channel, this.service));
		}
	},
	
	HMCH : function(url, path, channel){
		var router = this.HTTP(url, path);
		if (channel){
			this.logger.trace("Channeling path: " + path + " --> " + channel);
			router.for("Main", path, new RoutingService.HttpMultiChannelsClient(channel, this.service));
		}
	},
	
	GET : function(url, path, channel){
		return this.HTTP.apply(this, arguments);
	},
	
	POST : function(url, path, channel){
		return this.HTTP.apply(this, arguments);
	},
	
	PUT : function(url, path, channel){
		return this.HTTP.apply(this, arguments);
	},
	
	"DELETE" : function(url, path, channel){
		return this.HTTP.apply(this, arguments);
	},
	
	SEARCH : function(url, path, channel){
		return this.HTTP.apply(this, arguments);
	},
	
	_createHttpServer : function (tcpListener){
		var port = this.port;
		var self = this;
		var httpServer = http.createServer(function(req, res){
			var host = req.headers.host;
			var router = self.HttpRouters[host];
			if (!router) router = self.HttpRouters["default"];
			if (!router){
				res.statusCode = 404;
				res.end("No routers for " + host);
				return false;
			}
			var url = "http://" + host + ":" + port + req.url;
			url = Url.parse(url.toLowerCase(), true);
			//res.setHeader("Allow", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
			res.setHeader("Access-Control-Allow-Headers", "origin,content-type,request-type,node-id,client-id");
			res.setHeader("Access-Control-Expose-Headers", "content-type,Content-Type,ETag,Finish,Server,ServiceUrl,Date,Start,Load,Node,NodeId,NodeType");
			if (self.service.advancedHttpHeaders){
				for (var header in self.service.advancedHttpHeaders){
					var value = self.service.advancedHttpHeaders[header];
					res.setHeader(header, value);
				}
			}
			if (self.service.serviceUrl){
				res.setHeader("ServiceUrl", self.service.serviceUrl);
			}
			res.setHeader("Server", self.owner);
			return router.Process(router.GetContext(req, res));
		});
		tcpListener.on("listening", function(){
			httpServer.listen(tcpListener);
		});
		tcpListener.on("close", function(){
			httpServer.close();
		});
		return httpServer;
	},

	_createHttpRouter : function(){
		var router = new HttpRouter("/", 7000);
		//router.map("Security", {});
		router.map("Main", 
				   {
					   "/map": {
						   GET : function(context){
							   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
							   context.finish(200, JSON.stringify(RoutingService.CreateMap(router.Handlers.Main)));
						   }
					   },
					   "/routing" : {
							GET : function(context){
								var obj = {
									waiting : router.WaitingContextsCount,
									processing : router.ProcessingContextsCount,
								}
								context.res.setHeader("Content-Type", "application/json; charset=utf-8");
								context.finish(200, JSON.stringify(obj));
							}
					   },
					   "/channelsMap" : {
						   GET : function(context){
							   context.res.setHeader("Content-Type", "application/json; charset=utf-8");
							   context.finish(200, JSON.stringify(RoutingService.CreateChannelMap(Channels.routes)));
							}
					   }
				   });
		return router;
	},

	
	AttachSocketListener : function(server){
		//sio.serveClient(false);
		server = require('socket.io').listen(server);
		server.on('connection', function (socket) {
			//console.log(socket);
			var path = '/' + socket.namespace.name;
			console.log("S>>> Channel ssssubscribe: " + path);
			socket.on("message", function(message, data){
				message = JSON.parse(message);
				Channels.emit(path + message.path, message.data);
			});
			var handler = function(data, arg){
				socket.emit('message', arguments);
			}
			Channels.on(path, handler);			
			socket.on('disconnect', function (socket) {
				Channels.clear(path, handler);
				console.log("S<<< Channel uuuunsubscribe: " + path);
			});	
		});
	},
};

RoutingService.HttpChannelsClient = function(subscriptionPath, service){
	this.logger = service.logger;
	this.service = service;
	if (subscriptionPath){
		this.spath = subscriptionPath;
	}
	else{
		this.spath = "";
	}
}

RoutingService.HttpChannelsClient.prototype = {	
	GET : function(context){
		var self = this;
		if (context.completed || context.finalized){
			this.logger.error("Unexpected context finish!");
			return true;	
		}
		var path = context.pathTail.trim();
		var response = context.res;
		var request = context.req;
		if (path.lastIndexOf("/") == path.length - 1){
			path = path.substring(0, path.length - 1);
		}
		path = self.spath + path;
		var handler = function(message){
			try{
				var params = [];
				for (var i = 0; i < arguments.length; i++){
					//if (arguments[i].length && arguments[i].length > 100) params.push("Long param: " + arguments[i].length);
					params.push(arguments[i]);
				}
				params = JSON.stringify(params);
				response.write(params + "\n");
			}
			catch(e){
				self.logger.error(e);
				response.statusCode = 500;
				response.end(e + "\n");
			}
		}
		request.on("close", function(){
			self.logger.debug("<< Channel unsubscribe: " + path);
			Channels.un(path, handler);
		});
		self.logger.debug(">> Channel subscribe: " + path);
		response.setHeader("Content-Type", "application/json; charset=utf-8");		
		response.writeHead(200);
		context.abort();
		this.service.on("unloading", function(){
			response.end();
		});
		Channels.on(path, handler);
		return false;
	},

	POST : function(context){
		if (context.completed){
			return true;	
		}
		var path = context.pathTail.trim();
		if (path.lastIndexOf("/") == path.length - 1){
			path = path.substring(0, path.length - 1);
		}
		var response = context.res;
		var request = context.req;
		var fullData = "";		
		var self = this;
		response.setHeader("Content-Type", "application/json; charset=utf-8");
		request.on("data", function(data){
			fullData += data;		
		});
		request.on("end", function(){
			self.logger.debug("Emitting: " + path);
			try{
				var messages = JSON.parse(fullData);
				if (messages.length){
					var message = messages[0];
					if (message && message.source){
						messages[0] = path + message.source;
					}
				}
				else{
					messages = [path, messages];
				}
				var result = Channels.emit.apply(Channels, messages);
				context.finish(200, JSON.stringify(result));
				context.continue();
			}
			catch (err){
				self.logger.error("HTTP Channels client error on " + path + "");
				self.logger.error(err);
				context.finish(500, err + "");
				context.continue();
				return;
			}
		});		
		return false;
	},

	SEARCH :  function(context){
		if (context.completed){
			return true;	
		}
	},
}

RoutingService.HttpMultiChannelsClient = function(subscriptionPath, service){
	this.logger = service.logger;
	this.service = service;
	if (subscriptionPath){
		this.spath = subscriptionPath;
	}
	else{
		this.spath = "";
	}
	if (this.spath == "/") this.spath = "";
	this.clients = {};
}

RoutingService.HttpMultiChannelsClient.prototype = {	
	POST : function(context){
		if (context.completed || context.finalized){
			this.logger.error("Unexpected context finish!");
			return true;	
		}
		if (!context.getHeader("request-type") == "channel"){
			return true;
		}			
		var self = this;
		var basePath = context.pathTail.trim();
		var response = context.res;
		var request = context.req;
		if (basePath.lastIndexOf("/") == basePath.length - 1){
			basePath = basePath.substring(0, basePath.length - 1);
		}
		basePath = self.spath + basePath;
		var pathHandlers = {};
		var fullData = "";	
		
		function closeResponse(){
			response.end();
		}
		
		this.service.on("unloading",closeResponse);
		
		function cleanUp(){
			self.service.removeListener("unloading",closeResponse);
			for (var path in pathHandlers){
				var handler = pathHandlers[path];
				self.logger.debug("<< Channel unscribe: " + path);
				Channels.un(path, handler);
			}
		};
		
		response.on("finish", cleanUp);
		request.on("close", cleanUp);
		
		request.on("data", function(data){
			fullData += data;		
		});
		
		request.on("end", function(){
			try{
				if (fullData.length > 0){
					var messages = JSON.parse(fullData);
					for (var i = 0; i < messages.length; i++){
						var path = messages[i];
						path = basePath + path;
						var handler = pathHandlers[path] = self._createHandler(context);
						self.logger.debug(">> Channel subscribe: " + path);
						Channels.on(path, handler);
					}
				}
				else{
					var handler = pathHandlers[basePath] = self._createHandler(context);
					self.logger.debug(">> Channel subscribe: " + basePath);
					Channels.on(basePath, handler);
				}
			}
			catch (err){
				self.logger.error("Channels list reading error " + path + "");
				self.logger.error(err);
				context.finish(500, err + "");
				return;
			}
		});
		
		closeTimeout = setTimeout(function(){
			response.end('{info: "Multi-channel http-request timeout"}');
		}, 60000 * 1);
		
		response.setHeader("Transfer-Encoding", "chunked");		
		response.setHeader("Content-Type", "application/json; charset=utf-8");		
		response.writeHead(200);
		context.abort();
		
		
		return false;
	},
	
	_createHandler : function(context){
		var self = this;
		var response = context.res;
		var request = context.req;
		var handler = function(message){
			try{
				var params = [];
				for (var i = 0; i < arguments.length; i++){
					//if (arguments[i].length && arguments[i].length > 100) params.push("Long param: " + arguments[i].length);
					params.push(arguments[i]);
				}
				params = JSON.stringify(params);
				response.write(params + "\n");
			}
			catch(e){
				self.logger.error(e);
				response.statusCode = 500;
				response.end(e + "\n");
			}
		};
		return handler;
	},
	
	PUT : function(context){
		if (context.completed){		
			this.logger.error("Unexpected context finish!");
			return true;	
		}
		if (!context.getHeader("request-type") == "channel"){
			return true;
		}
		var basePath = context.pathTail.trim();
		if (basePath.lastIndexOf("/") == basePath.length - 1){
			basePath = basePath.substring(0, basePath.length - 1);
		}		
		basePath = self.spath + basePath;
		var response = context.res;
		var request = context.req;
		var fullData = "";		
		var self = this;
		context.setHeader("Content-Type", "application/json; charset=utf-8");
		request.on("data", function(data){
			fullData += data;		
		});
		request.on("end", function(){
			try{
				var messages = JSON.parse(fullData);
				var result = "";
				if (typeof message == 'object'){
					if (messages.length){
						var message = messages[0];
						if (message && message.source){
							messages[0] = basePath + message.source;
						}
					}
					else{
						var message = messages;
						messages = [];
						messages[0] = message;
						if (message.args){
							for (var i = 0; i < message.args.length; i++){
								messages.push(message.args[i]);
							}
						}
						delete message.args;
						messages[0] = basePath + message.source;
						self.logger.debug("Emitting: " + messages[0]);
					}
					var result = Channels.emit.apply(Channels, messages);
					result = JSON.stringify(result);
				}
				context.finish(200, result);
				context.continue();

			}
			catch (err){
				self.logger.error("HTTP Channels client error on " + path + "");
				self.logger.error(err);
				context.finish(500, err + "");
				context.continue();
				return;
			}
		});		
		return false;
	},

	SEARCH :  function(context){
		if (context.completed){		
			this.logger.error("Unexpected context finish!");
			return true;	
		}
		if (!context.getHeader("request-type") == "channel"){
			return true;
		}
	},
	
	OPTIONS :  function(context){
		if (context.completed){		
			this.logger.error("Unexpected context finish!");
			return true;	
		}
		if (context.getHeader("request-type") == "channel"){
			context.finish(200);
		}
		return true;
	},
}

module.exports = RoutingService;