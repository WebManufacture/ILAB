var http = require('http');
var Url = require('url');
var path = require('path');
var fs = require('fs');

require(path.resolve("./ILAB/Modules/Utils.js"));
var RouterModule = require(path.resolve("./ILAB/Modules/Router.js"));
require(path.resolve("./ILAB/Modules/Channels.js"));
var channelsClient = require(path.resolve("./ILAB/Modules/ChannelsClient.js"));
var Files = require(path.resolve("./ILAB/Modules/Files.js"));

AdminServer = {
	Init : function(config, localRouter, router, logger){
		localRouter.for("Main", "/", function(context){
		context.res.setHeader("Content-Type", "text/html; charset=utf-8");
		   fs.readFile(config.basepath + "/Config.htm", "utf8", function(err, result){   
			   if (err){
				   context.finish(500, "Not found files view page " + err);
				   return;
			   }		
			   context.finish(200, result);
		   });
		   return false;
		});
		
		var serv = this;
		
		localRouter.for("Main", "/Nodes/<", NodesRouter);
		localRouter.for("Main", "/<", Files(config, logger));
		ILab.ServiceUrl = (config.Host ? (config.Host + (config.Port ? ":" + config.Port : "")) : "") + (config.Path ? config.Path : "");
	},
	
	Start : function(server){
		this.SockServer = useSystem('socket.io').listen(server, { log: false });
		this.SockServer.on('error', function(err){
			console.log(">>>Admin socket server error: ");
			console.error(err);
		});
		this.SockServer.on('connection', function (socket) {
			var path = '/';
			if (socket.namespace){
				path += socket.namespace.name;
			}
			socket.on('error', function (err) {
				console.log(">>>Admin socket server Channel error: " + path);
				console.error(err);
			});
			//console.log("A>>> Channel subscribe: " + path);
			var handler = function(data, arg){
				socket.emit('message', [data, arg]);
			}
			Channels.on("/*.node", handler);		
			socket.on('disconnect', function (socket) {
				Channels.clear("/*.node", handler);
				//console.log("A<<< Channel unsubscribe: " + path);
			});	
			socket.on("message", function(message, data){
				message = JSON.parse(message);
				console.log(message);
				Channels.emit(message.path, message.data);
			});
		});		
	},
	
	Stop : function(){
		if (this.SockServer){
			this.SockServer.close();
			this.SockServer = null;
		}		
	},
	
	RedirectSocket : function(context){
		context.abort();
		this.SockServer.handleRequest(context.req, context.res);
		return false;
	},
};



NodesRouter = {
	GET : function(context){
		var nodeId = context.pathTail.trim();
		if (nodeId.lastIndexOf("/") == nodeId.length - 1){
			nodeId = nodeId.substring(0, nodeId.length - 1);
		}
		if (nodeId.start("/")) nodeId = nodeId.substring(1);
		var node = global.ILab.Nodes[nodeId];
		if (node){
			context.res.setHeader("Content-Type", "application/json; charset=utf-8");
			context.finish(200, JSON.stringify(node.serialize()));
		}
		else{
			context.finish(404, "node " + nodeId + " not found");
		}
		return true;
	},
	SEARCH : function(context){
		context.res.setHeader("Content-Type", "application/json; charset=utf-8");
		var items = [];
		for (var item in global.ILab.Nodes){
			items.push(global.ILab.Nodes[item].serialize());
		}
		context.finish(200, JSON.stringify(items));
		return true;
	},
	POST : function(context){
		var fullData = "";
		context.req.on("data", function(data){
			fullData += data;		
		});
		context.req.on("end", function(){
			try{
				var doc = JSON.parse(fullData);
				
			}
			catch (err){
				context.finish(500, "JSON error: " + err);
			}
			context.continue(context);
		});
		return false;
	},
	DELETE : function(context){
	
	}
};

module.exports = AdminServer;