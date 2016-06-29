var http = require('http');
var Url = require('url');
var path = require('path');
var fs = require('fs');

useModule("Utils.js");
useModule("Channels.js");
var Files = useModule("Files.js");
useNodeType("ManagedNode");

AdminService = function(){
	
};

AdminService.prototype = {
	loading : function(node){
		var serv = this;
		this.channel = node.channel;
		this.FilesRouter = new FilesRouter(node.basepath);
		if (this.channel){
			function GetFilesFunction(message, context){
				if (!context.finished){
					if (serv.config.DefaultFile && (context.pathTail == "" || context.pathTail == "/")){
						context.pathTail += serv.config.DefaultFile;
					}
					return serv.FilesRouter.GET(context);
				}
			}
			
			/*function NodeStateFollower(){
				Channels.emit(serv.channel + "/NodeStates/" + this.id + "." + this.Status, arguments);
			}
			
			function CreateNodeStateSubscription(Node){
				Node.on('state', NodeStateFollower);
				if (Node.ChildNodes) {
					for (var node in Node.ChildNodes){
						CreateNodeStateSubscription(Node.ChildNodes[node]);
					}
				}
			}
			
			CreateNodeStateSubscription(RootNode);*/
			
			node.subscribeToChannel(this.channel + "/Static.GET", GetFilesFunction);
			node.subscribeToChannel(this.channel + "/Nodes", function(message, context){
				if (AdminService.NodesRouter[context.method]){
					return AdminService.NodesRouter[context.method](context);
				}
				return false;
			});
			/*
			localRouter.for("Main", "/Nodes/<", NodesRouter);
			localRouter.for("Main", "/<", Files(config, logger));
			*/
		}
		return true;
	},
	
	unloading : function(node){
		this.FilesRouter = null;
		return true;
	},
	
	starting : function(node){
		/*this.SockServer = require('socket.io').listen(server, { log: false });
		this.SockServer.on('connection', function (socket) {
			//console.log(socket);
			var path = '/' + socket.namespace.name;
			console.log("S>>> Channel subscribe: " + path);
			var handler = function(data, arg){
				socket.emit('message', [data, arg]);
			}
			Channels.on("/*.node", handler);		
			socket.on('disconnect', function (socket) {
				Channels.clear("/*.node", handler);
				console.log("S<<< Channel unsubscribe: " + path);
			});	
			socket.on("message", function(message, data){
				message = JSON.parse(message);
				console.log(message);
				Channels.emit(message.path, message.data);
			});
		});	*/
		return true;		
	},
	
	stopping: function(node){
		return true;
	},
		
	RedirectSocket : function(context){
		context.abort();
		this.SockServer.handleRequest(context.req, context.res);
		return false;
	},
};

AdminService.SerializeNode = function(node){
	var config = node.config;
	var obj = {
		key : node.id,
		id : node.id,
		state : node.State,
		status : node.Status,
		nodeType : node.type,
		name : node.id,
		config : node.config
	};
	for (var item in config){
		var key = item.toLowerCase();
		obj["_cfg_" + key] = config[key];
	}
	if (node.ChildNodes){
		obj.Nodes = {};
	}
	return obj;
}

AdminService.CreateNodeMap = function(Node){
	var rNode = AdminService.SerializeNode(Node);
	if (Node.ChildNodes) {
		rNode.Nodes = {};
		for (var node in Node.ChildNodes){
			var nnode = Node.ChildNodes[node];
			nnode = AdminService.CreateNodeMap(nnode);
			rNode.Nodes[node] = nnode;
		}
	}
	return rNode;	
}

AdminService.NodesRouter = {
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
		context.setHeader("Content-Type", "text/json; charset=utf-8");
		context.finish(200, JSON.stringify(AdminService.CreateNodeMap(RootNode)));
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

module.exports = AdminService;