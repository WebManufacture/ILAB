var http = require('http');
var Url = require('url');
var path = require('path');
require(path.resolve("./ILAB/Modules/Utils.js"));
require(path.resolve("./ILAB/Modules/Channels.js"));
var logger = require(path.resolve("./ILAB/Modules/Logger.js"));

NodesRouter = {
	Handler: {
		GET : function(context){
			var nodeId = context.pathTail.trim();
			if (nodeId.lastIndexOf("/") == nodeId.length - 1){
				nodeId = nodeId.substring(0, nodeId.length - 1);
			}
			if (nodeId.start("/")) nodeId = nodeId.substring(1);
			var node = global.ILab.Nodes[nodeId];
			if (node){
				context.res.setHeader("Content-Type", "text/json; charset=utf-8");
				context.finish(200, JSON.stringify(node.serialize()));
			}
			else{
				context.finish(404, "node " + nodeId + " not found");
			}
			return true;
		},
		SEARCH : function(context){
			context.res.setHeader("Content-Type", "text/json; charset=utf-8");
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
	}
};

module.exports = NodesRouter;