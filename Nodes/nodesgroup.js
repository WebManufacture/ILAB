var Path = require('path');

useModule("Utils.js");
useModule("Async.js");
useModule("channels.js");
useNodeType("node.js");

function NodeGroup (parentNode, item){
	NodeGroup.super_.apply(this, arguments);
	this.type = NodeGroup.Type;
	var self = this;
	//Channels.on("/global/config.changed", CreateClosureMap(self._configChanged, self, 2));
	/*
	Channels.on("/global/node.delete", CreateClosureMap(self._deleteNode, self, 2));
	Channels.on("/global/node.add", CreateClosureMap(self._addNode, self, 2));
	Channels.on("/global/node.start", CreateClosureMap(self._startNode, self, 2));
	Channels.on("/global/node.stop", CreateClosureMap(self._stopNode, self, 2));
	Channels.on("/global/node.unload", CreateClosureMap(self._unloadNode, self, 2));
	Channels.on("/global/node.load", CreateClosureMap(self._loadNode, self, 2));
	Channels.on("/global/node.reload", CreateClosureMap(self._reloadNode, self, 2));*/
};

global.NodeGroup = NodeGroup;

global.NodeGroup.Type = "nodesgroup";

Inherit(NodeGroup, ManagedNode, {
	configure : function(cfg){	
		if (NodeGroup.base.configure){
			NodeGroup.base.configure.call(this, cfg);
		}
		
		if (!this.id && !cfg.id){
			this.id = "nodes-group" + parseInt(Math.random()*1000);
		}
		
		this.Modules = [];
		/*
		this.subscribe("/control.load", function(){
			self.Load();
		}, true);
				
		this.subscribe("/control.unload", function(){
			self.Unload();
		});
		this.subscribe("/control.start", function(){
			self.Start();
		});
		this.subscribe("/control.stop", function(){
			self.Stop();
		});
		this.subscribe("/control.sleep", function(){
			self.Sleep();
		});*/
		
		return true;
	},
	
	//To process "callback" automatically you should return 'True', otherwise you should process "callback" manually
	//If you return 'false', a "callback" will not be processed
	load : function(){
		try{
			var self = this;
			
			if (!this.lconfig.nodes) this.lconfig.nodes = {};
			this.ChildNodes = {};
			var citems = this.lconfig.nodes;
			var nodes = {};
			
			for (var nodeId in citems){
				var item = citems[nodeId];
				item.id = nodeId;
				var node = Frame.CreateNode(item, 'base', this.logger);
				if (node){
					nodes[nodeId] = node;
					node.on('state', function(state, stateOld){
						if (this.logger){
							this.logger.trace("{0} => {1}", Node.Statuses[stateOld], Node.Statuses[state]);
						}
						else{
							self.logger.trace("{0}:%bright;%white;{1} %normal;{2} => {3}", this.type, this.id, Node.Statuses[stateOld],Node.Statuses[state]);
						}
					});
					if (item.State == "working"){
						this.logger.debug("%green;{0}:%normal;{1} {2}", node.type, item.id, item.File ? item.File : "");
					}
					else
					{
						this.logger.debug("%yellow;{0}:%normal;{1} {2}", node.type, item.id, item.File ? item.File : "");	
					}
				}
			}
			
			for (var nodeId in nodes){			
				var node = nodes[nodeId];
				var item = citems[nodeId];			
				node.originalId = nodeId;
				try{
					node.Init();
					node.Configure(item);
					if (node.defaultState === undefined){
						node.defaultState = Node.States.LOADED;
					};
				}
				catch(err){
					this.logger.error(err);
				};
				this.ChildNodes[node.id] = node;				
			}
			
			var lf = new Async.Waterfall(function loadComplete(){						
				self.State = Node.States.LOADED;
				this.destroy();
			});
			
			for (var id in self.ChildNodes){
				var node = self.ChildNodes[id];
				if (node.defaultState >= Node.States.LOADED && node.defaultState < Node.States.UNLOADING && node.State >= Node.States.INITIALIZED){
					var cb = lf.getCallback();
					node.once('initialized', cb);
					node.once('exception', cb);
					node.once('loaded', cb);
					//lf.add(node.Load, node);
				}
			}
			
			for (var id in self.ChildNodes){
				var node = self.ChildNodes[id];
				if (node.defaultState >= Node.States.LOADED && node.defaultState < Node.States.UNLOADING && node.State >= Node.States.INITIALIZED){
					try{
						node.Load();
					}
					catch(err){
						lf.revertCallback();
						this.logger.error(err);
					};
				}
			}

			lf.check();
		}
		catch(err){
			this.logger.error(err);
			this.State = Node.States.EXCEPTION;
		}
		return false;
	},

	unload : function(){
		var self = this;
		var wf = new Async.Waterfall(function unloadComplete(){
			delete self.ChildNodes;
			self.State = Node.States.UNLOADED;
			this.destroy();
		});
		for (var id in self.ChildNodes){
			var node = self.ChildNodes[id];
			if (node.State < Node.States.UNLOADING) wf.subscribe(node, "unloaded");
		}
		for (var id in this.ChildNodes){
			try{
				if (node.State < Node.States.UNLOADING) this.ChildNodes[id].Unload();
			}
			catch (error){
				this.logger.error(error);
			}
		}
		wf.check();
		
		return false;
	},

	start : function(callback){
		var self = this;
		for (var id in this.ChildNodes){
			var node = this.ChildNodes[id];
			if ((!node.defaultState || (node.defaultState >= Node.States.WORKING && node.defaultState < Node.States.UNLOADING)) && (node.State >= Node.States.LOADED && node.State <= Node.States.STOPPED)){
				try{
					node.Start(function(){
						try{
							if (this.defaultState == Node.States.SLEEP){
								this.sleep();
							}
							if (this.defaultState == Node.States.STOPPED){
								this.Stop();
							}
						}			
						catch(err){
							self.logger.error(err);
						};
					});
				}			
				catch(err){
					self.logger.error(err);
				};
			}
		}
		return true;
	},

	stop : function(callback){
		for (var id in this.ChildNodes){
			var node = this.ChildNodes[id];
			try{
				if (node.State >= Node.States.WORKING && node.State < Node.States.STOPPED) node.Stop();
			}			
			catch(err){
				self.logger.error(err);
			};
		}
		return true;
	},

	sleep : function(callback){
		for (var id in this.ChildNodes){
			var node = this.ChildNodes[id];
			try{
				if (node.State == Node.States.WORKING)	node.Sleep();
			}			
			catch(err){
				self.logger.error(err);
			};
		}
		return true;
	},

	SaveConfig : function(){
		if (this.ConfigFile){
			this.logger.info('config rewrite');
			fs.writeFileSync(this.ConfigFile, JSON.stringify(this.config), 'utf8');
		}
	},
	
	_configChanged : function(param){
		
	},
	
	_deleteNode : function(param){
		
	},
	
	_addNode : function(param){
		
	},
	
	_startNode : function(param){
		
	},
	
	_stopNode : function(param){
		
	},
	
	_unloadNode : function(param){
		
	},
	
	_loadNode : function(param){
		
	},
	
	_reloadNode : function(param){
		
	}
});

module.exports = NodeGroup;	