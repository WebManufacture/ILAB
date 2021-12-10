useModule("utils.js");

function MapNode(parentPath){
	this["/"] = [];
	this["<"] = [];
	this[">"] = [];
	this["//"] = parentPath;
};

Router = function(timeout){
	this.HandlersIndex = [];
  this.Handlers = new MapNode("/");;
	this.basePath = "";
  this.Enabled = true;
	this.WaitingContexts = {};
	this.WaitingContextsCount = 0;
	this.ProcessingContexts = {};
	this.ProcessingContextsCount = 0;
	if (!timeout) timeout = 5000;
	this.timeout = timeout;
};

Router.prototype = {
	on : function(path, handler){
	  return this["for"](path, handler);
	},

	un : function(handler){
	    return this._removeHandler(this.Handlers, handler);
	},

	"for" : function(path, handler){
		return this._addHandler(this.Handlers, path.toLowerCase(), handler);
	},

	map : function(map){
		if (map){
			for (var path in map){
				this._addHandler(this.Handlers, path.toLowerCase(), map[path]);
			}
		}
	},

	GetContext: function(selector, data){
		var context = new RoutingContext(selector, this.basePath, data);
		context.debugMode = this.debugMode;
		return context;
	},

  do: function(selector, data){
      return this.Process(this.GetContext(selector, data));
  },

	Process: function(context){
		this.ProcessingContextsCount++;
		this.ProcessingContexts[context.id] = context;
		context.router = this;
		context.callPlans = [];
		context.getCallPlan(context.callPlans, this.Handlers, 0);
		context.log("callPlan : ", context.callPlans.length);
		context.callPhaseChain(0);
		return context;
	},


    _removeHandler : function(root, handler){
        if (!handler){
            return null;
        }
        for (var key in root){
        	if (typeof root[key] == "object"){
        		if (root[key] instanceof Array){
        			var arr = root[key];
        			for (var i = 0; i < arr.length; i++){
        				if (arr[i] === handler){
        					arr.splice(i, 1);
        					return;
							}
						}
					}
					else{
	        			this._removeHandler(root[key], handler);
					}
				}
			}
    },

	_addHandler : function(root, path, handler){
		if (!handler){
			return null;
		}
		if (!path || path == '') path = '/';
		if (!path.start("/")) path = '/' + path;
		var parts = path.split('/');
		parts.shift();
		var lastPart = parts[parts.length - 1];
		if (lastPart == "<"){
			parts = parts.slice(0, parts.length - 1);
			return this._addHandlerInternal(root, parts, handler, '<');
		}
		if (lastPart == ">"){
			parts = parts.slice(0, parts.length - 1);
			return this._addHandlerInternal(root, parts, handler, '>');
		}
		return this._addHandlerInternal(root, parts, handler, '/');
	},

	_addHandlerInternal : function(root, parts, handler, endHandlerSymbol){
		//console.log("calling addhandler! " + JSON.stringify(parts) + " " + endHandlerSymbol);
		var parentPath = root["//"];
		var cg = root;
		for (var i = 0; i < parts.length; i++){
			var p = parts[i];
			if (p == ""){
				break;
			}
			parentPath = parentPath + p + "/";
			if (!cg[p + "/"]){
				cg[p + "/"] = new MapNode(parentPath);
			}
			cg = cg[p + "/"];
		}
		var ch = cg[endHandlerSymbol];
		if (typeof (handler) == "object" && handler instanceof Array){
			for (var i = 0; i < handler.length; i++){
				ch.push(handler[i]);
			}
		}
		else{
			ch.push(handler);
		}
		return cg;
	},
};

RoutingContext = function(selector, rootPath, data){
	this.id = (Math.random() + "").replace("0.", "");
	this.data = data;
	this.query = this.url.query;
	this.logs = [];
    this.path = selector;
	if (rootPath){
		this.rootPath = rootPath.toLowerCase().substring(1).replace(">","").replace("<","");
		pathname = pathname.replace(this.rootPath, "");
	}
	this.paths = pathname.split('/');
	this.paths.shift();
	for (var i = 0; i < this.paths.length; i++){
		var p = this.paths[i];
		if (p == ""){
			this.paths = this.paths.slice(0, i);
			break;
		}
		this.paths[i] = p + "/";
	}
	this.phases = [];
	this.phaseProcessed = true;//Вообще фаза еще не обработана, но этот флаг как бы указывает, что обработана фаза предыдущая
	this.startTime = new Date();
	this.log("start: ", this.startTime);
	this.callPlans = {};
}

global.RoutingContext.phaseTimeout = 30;

global.RoutingContext.prototype = {
	getCallPlan : function(callPlan, mapNode, pathNum){
		if (!mapNode) {
			//this.log("CallPlan: Node not found");
			return ;
		}
		this.getHandlers(callPlan, mapNode, mapNode[">"], ">", pathNum);
		if (pathNum < this.paths.length){
			var path = this.paths[pathNum];
			this.getCallPlan(callPlan, mapNode[path], pathNum + 1);
		}
		else{
			this.getHandlers(callPlan, mapNode, mapNode['/'], "/", pathNum);
		}
		this.getHandlers(callPlan, mapNode, mapNode["<"], "<", pathNum);
	},

	getHandlers : function(callPlan, mapNode, handlers, path, pathNum){
		var result = false;
		if (handlers && handlers.length > 0){
			for (var g = 0; g < handlers.length; g++){
				var handler = handlers[g];
				if (handler){
					if (typeof handler == 'function'){
						this.log("CallPlanF ",pathNum, ": ", mapNode["//"], path);//  :", "\n   ", handler.toString());
						var hobj = {};
						hobj.handler = handler;
						hobj.pathNum = pathNum;
						hobj.node = mapNode;
						hobj.path = mapNode["//"];
						callPlan.push(hobj);
						result = true;
					}
					if (typeof handler == 'object' && typeof handler[this.req.method] == 'function'){
						this.log("CallPlanO ",pathNum, ": ", mapNode["//"], path);// :\n   ", handler[this.req.method].toString());
						var hobj = {};
						hobj.handler = handler[this.req.method];
						hobj.owner = handler;
						hobj.pathNum = pathNum;
						hobj.node = mapNode;
						hobj.path = mapNode["//"];
						callPlan.push(hobj);
						result = true;
					}
				}
				else{
					this.log("CallPlan ",pathNum, ": ", mapNode["//"], path, " NULL handler!");
				}
			}
		}
		return result;
	},

	callPhaseChain : function(phaseNum, numSpaces){
		var context = this;
		if (!numSpaces) numSpaces = 0;
		var maxSpaces = 5000/RoutingContext.phaseTimeout;
		if (this.router && this.router.timeout){
			maxSpaces = this.router.timeout/RoutingContext.phaseTimeout;
		}
		if (!context.longPhase && numSpaces > maxSpaces){
			this._finish(500, "Response timeout " + (maxSpaces * RoutingContext.phaseTimeout/1000) + " seconds ");
			return;
		}
		if (this.completed) {
			this.log("RoutingContext completed");
			this.finishHandler(this);
			return;
		}
		if (!phaseNum){
			phaseNum = 0;
		}
		if (this.phaseProcessed){
			if (phaseNum < this.phases.length){
				var phaseName = this.phases[phaseNum];

				this.callPlan = this.callPlans[phaseName];
				this.phaseProcessed = false;
				this.handlerNum = -1;
				//Тут должно произойти собственно выполнение найденных ф-й согласно плану вызовов.
				this.log("Phase ", phaseNum, "[", phaseName, "] Starting");
				var result = this.continue(this);
				this.log("Phase ", phaseNum, "[", phaseName, "] Called " + result);
				if (result){
					if (phaseNum + 1 < this.phases.length ){
						this.callPhaseChain(phaseNum + 1, numSpaces + 1);
					}
					else{
						this.finishHandler(this);
					}
				}
				else{
					if (!this._aborted){
						if (this.router && !this.router.WaitingContexts[this.id]){
							this.router.WaitingContexts[this.id] = this;
							this.router.WaitingContextsCount++;
						}
						this._currentTimeout = setTimeout(function(){
							context.log("New Phase ", phaseNum, " [", context.phases[phaseNum], "] WAITING!", numSpaces);
							context.callPhaseChain(phaseNum, numSpaces + 1);
						}, RoutingContext.phaseTimeout);
					}
					else{
						this._abortProcessing();
					}
				}
			}
			else{
				this.finishHandler(this);
			}
		}
		else
		{
			if (!this._aborted){
				if (this.router && !this.router.WaitingContexts[this.id]){
					this.router.WaitingContexts[this.id] = this;
					this.router.WaitingContextsCount++;
				}
				this._currentTimeout = setTimeout(function(){
					context.log("Last Phase ", phaseNum, " [", context.phases[phaseNum], "] WAITING!", numSpaces);
					context.callPhaseChain(phaseNum, numSpaces + 1);
				}, RoutingContext.phaseTimeout);
			}
			else{
				this._abortProcessing();
			}
		}
		this.log("Phase ", phaseNum, " Exited");
	},

	"abort" : function(){
		this._aborted = true;
		clearTimeout(this._currentTimeout);
	},

	"continue" : function(){
		var context = this;
		if (context.phaseProcessed || context.stop){return true;}
		context.handlerNum++;
		if (context.handlerNum < context.callPlan.length){
			var hobj = context.callPlan[context.handlerNum];
            context.nodePath = hobj.path.length > 1 ? hobj.path.slice(0, -1) : "/";
			context.node = (context.paths[hobj.pathNum]) ? context.paths[hobj.pathNum].slice(0, -1) : "";
			context.current =  context.nodePath + "/" + context.node;
            context.nodeName = context.path.substr(context.nodePath == '/' ? 1: context.nodePath.length + 1, context.node.length);
			context.prevNode = context.paths[hobj.pathNum - 1];
			if (context.prevNode) context.prevNode = context.prevNode.slice(0, -1);
			context.nextNode = context.paths[hobj.pathNum + 1];
            if (context.nextNode) context.nextNode = context.nextNode.slice(0, -1);
            context.tail = context.path.substr(context.current.length);
			context.log("Calling ", context.nodePath, ' with ', context.tailPath);
			try{
				if (hobj.owner){
					var result = hobj.handler.call(hobj.owner, context, context.continue);
				}
				else{
					var result = hobj.handler(context, context.continue);
				}
				if (result == false)
				{
					context.waiting = true;
					return false;
				}
				if (context._aborted){
					context.phaseProcessed = true;
					return false;
				}
			}
			catch (error){
				context.phaseProcessed = true;
				context.error(error);
				context._finishWithError(error);
				return true;
			}
			return context.continue(context);
		}
		else{
			context.phaseProcessed = true;
			return true;
		}
	},

	finishHandler : function(context){
		context.log("complete: ", new Date());
		if (!this._aborted){
			if (context.completed){
				context._finish(context.endStatus, context.endResult);
			}
			else{
				context._finish(404, "No handlers found for path " + context.path);
			}
		}
	},

	write : function(result){
		if (!this.endResult) this.endResult = "";
		this.endResult += result;
	},


	setHeader : function(header, value){
		if (this.finalized || this.res.headersSent) return;
		return this.res.setHeader(header, value);
	},

	getHeader : function(header){
		return this.req.headers[header];
	},

	finish : function(result, encoding){
		if (this.completed) return;
		this.completed = true;
		this.endStatus = 200;
		this.endResult = result;
		this.encoding = encoding;
	},

	_abortProcessing : function(){
		if (this.router){
			this.log("RoutingContext aborted");
			if (this.router.WaitingContexts[this.id]){
				delete(this.router.WaitingContexts[this.id]);
				this.router.WaitingContextsCount--;
			}
			if (this.router.ProcessingContexts[this.id]){
				delete(this.router.ProcessingContexts[this.id]);
				this.router.ProcessingContextsCount--;
			}
			delete(this.router);
		}
		delete(this.callPlans);

        if (this.finalized) return;
        this.finalized = true;
	},

	_finish : function(status, result){
		if (this.router){
			if (this.router.WaitingContexts[this.id]){
				delete(this.router.WaitingContexts[this.id]);
				this.router.WaitingContextsCount--;
			}
			if (this.router.ProcessingContexts[this.id]){
				delete(this.router.ProcessingContexts[this.id]);
				this.router.ProcessingContextsCount--;
			}
			delete(this.router);
		}
		delete(this.callPlans);

        if (this.finalized) return;
        this.finalized = true;
	},

	getLogSpaces : function(num){
		var lgstr = "";
		if (num > 20) {
			num = 20;
			lgstr = "+";
		}
		for (var i = 1; i <= num; i++){
			lgstr += " ";
		}
		return lgstr;
	},

	log : function(){
		var lgstr = "";
		if (this.debugMode && this.debugMode == "trace"){
			for (var i = 0; i < arguments.length; i++){
				lgstr += this.formatLog(arguments[i]);
			}
			this.logs.push(lgstr);
            console.log(lgstr);
		}
		return lgstr;
	},

	formatLog : function(text){
		if (typeof text == 'string') return text;
		//if (text instanceof Date) return this.formatLog(text.date + 1, ".", text.month + 1, ".", text.fullYear,"  ", text.hours,":",text.minutes,":",text.seconds,".",text.milliseconds);
		if (typeof text == 'object') return JSON.stringify(text);
		return text + "";
	},

	formatLogs : function(){
		var lgstr = "\n";
		for (var i = 0; i < this.logs.length; i++){
			lgstr += this.logs[i] + "\n";
		}
		return lgstr;
	},

	formatError : function(error){
        if (typeof  error == "string") return error;
		return error.message + "\n" + error.stack
	},

	error : function(error){
		return this._finishWithError(error);
	},

	_finishWithError : function(error){
		if (this.logger){
			this.logger.warn(error);
		}
		if (!this.completed && !this.finalized){
			this.abort();
		}
		else{
			console.error("UNEXPECTED ROUTER ERROR!");
			console.error(error);
		}
        if (this.finalized) return;
        this.finalized = true;
	},
}

module.exports = Router;
