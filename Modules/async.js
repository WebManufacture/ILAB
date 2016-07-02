var EventEmitter = require("events").EventEmitter;

if (!global.Inherit){
	global.Inherit = function (Child, Parent, mixin){
		util.inherits(Child, Parent);
		if (mixin){
			for (var item in mixin){
				Child.prototype[item] = mixin[item];
			}
		}
		Child.base = Parent.prototype;
	};
};

global.Async = {
	Sync : function(){
		this.counter = 0;
		this.methods = 0;
	},

	Waterfall : function(callback){
		this.counter = 0;
		this.handlers = [];
		if (callback){
			this.once("done", callback);
		}
	},

	Collector : function(immediatly,ondone){
		var count = 0;
		if (typeof (immediatly) == 'boolean'){
			this.immediatly = immediatly;
		}
		if (ondone){
			this.once("done", ondone);
		}
		this.methods = [];
		if (count > 0){
			this.handlers = new Array(count);
			this.results = new Array(count);
			this.count = count;
		}
		else{
			this.handlers = [];
			this.results = [];
			this.count = 0;
		}
	},
};

Inherit(Async.Sync, EventEmitter, {
	callThere: function(callback){
		callback.ready = true;
		this.handlers.push(callback);
		return callback;
	},

	check: function(){
		var syncProto = this;
		var i = this.handlers.length;						
		var func = function(){
			syncProto.handlers[i] = {};
			syncProto.handlers[i].ready = true;
			syncProto._checkHandlers();
		}						
		func.ready = false;
		this.handlers[i] = func;
		return func;
	},

	add: function(callback){
		var syncProto = this;
		var i = this.handlers.length;						
		var func = function(){
			syncProto.handlers[i] = callback;
			syncProto.handlers[i].ready = true;
			syncProto.handlers[i].thisParam = this;
			syncProto.handlers[i].args = arguments;
			syncProto._checkHandlers();
		};		
		func.ready = false;
		this.handlers[i] = func;
		return func;
	},

	_checkHandlers : function(){
		var handlersReady = true;
		for (var j = 0; j < this.handlers.length; j++){
			handlersReady = handlersReady && (this.handlers[j].ready);
		}
		if (handlersReady){	
			for (var j = 0; j < this.handlers.length; j++){
				var hCall = this.handlers[j];
				if (typeof(hCall) == 'function'){
					hCall.apply(hCall.thisParam, hCall.args);
				}
			}
		}
	}
});

Inherit(Async.Collector, EventEmitter, {
	add : function(callback){
		var cb = this.getResultCallback();
		var func = function(){
			callback(cb);
		};		
		this.methods.push(func);
		if (this.immediatly) setImmediate(func); 
		return func;
	},
	
	createParametrizedCallback : function(param, thisParam, callback){
		if (typeof (thisParam) == 'function')  {
			callback = thisParam;
			thisParam = this;
		}
		if (!thisParam) thisParam = this;
		var cb = this.getResultCallback();
		if (!param) param = cb;
		var func = function(){
			callback.call(thisParam, param, cb);
		};		
		this.methods.push(func);
		if (this.immediatly) setImmediate(func); 
		return func;
	},
	
	addClosureCallback : function(callback, thisParam, args){
		if (typeof (thisParam) == 'function')  {
			callback = thisParam;
			thisParam = this;
		}
		if (!thisParam) thisParam = this;
		var cb = this.getResultCallback();
		if (!args) args = [];
		args.push(cb);
		var func = function(){
			callback.apply(thisParam, args);
		};		
		this.methods.push(func);
		if (this.immediatly) setImmediate(func); 
		return func;
	},

	run : function(callback){
		if (!this.immediatly) {
			for (var i = 0; i < this.methods.length; i++){
				setImmediate(this.methods[i]); 
			}
		};
		this.emit('start');
	},

	getResultCallback : function(){
		var syncProto = this;
		this.count++;
		var i = this.count - 1;
		var func = function(result){
			syncProto.handlers[i] = true;
			syncProto.results[i] = result;
			syncProto.emit('handler', result, i);
			syncProto._checkDone();
		};		
		return func;
	},

	_checkDone : function(){
		var handlersReady = true;
		for (var j = 0; j < this.count; j++){
			handlersReady = handlersReady && this.handlers[j];
		}
		if (handlersReady){	
			this.done();
		}
	},

	done : function(){
		this.emit('done', this.results);
	}
});

Inherit(Async.Waterfall, EventEmitter, {
	checkFunction : function(){
		this.counter--;
		this.emit("count");
		var self = this;
		if (this.counter == 0){
			setImmediate(function(){
				if (!self.destroyed){
					self.emit('done');
				}
			});
		}
	},

	getCallback : function(){
		var self = this;
		this.counter++;
		return function checkEventsDone(){
			if (!self.destroyed){
				self.checkFunction();
			}
		};
	},
	
	subscribe : function(emitter, event){
		var self = this;
		this.counter++;
		emitter.once(event, function checkEventsDone(){
			if (!self.destroyed){
				self.checkFunction();
			}
		})
	},
	
	unsubscribe : function(emitter, event, callback){
		if (this.counter > 0){
			this.counter--;
		}
		emitter.removeListener(event, callback);
	},
	
	add : function(callback, thisParam){
		if (thisParam) callback = CreateClosure(callback, thisParam);
		this.handlers.push(callback);
		return callback;
	},
	
	revertCallback : function(){
		var self = this;
		if (this.counter > 0){
			this.counter--;
		}
	},
	
	check : function(emitter, event){
		var self = this;
		if (this.counter == 0){
			setImmediate(function(){
				if (!self.destroyed){
					self.emit('done');
				}
			});
		}
		return this.counter == 0;
	},	
	
	run : function(callback){
		if (callback){
			this.once("done", callback);
		}
		for(var i = 0; i < this.handlers.length; i++){
			this.handlers[i]();
		}
		this.check();
	},
	
	destroy : function(){
		this.destroyed = true;
	}
});

module.exports = Async;