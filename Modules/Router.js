useModule("utils.js");

function MapNode(parentPath){
	this["/"] = [];
	this["<"] = [];
	this[">"] = [];
	this["//"] = parentPath;
};

Router = function(port, timeout){
	this.HandlersIndex = [];
	this.Handlers = {};
	this.basePath = "";
    this.Enabled = true;
	this.WaitingContexts = {};
	this.WaitingContextsCount = 0;
	this.ProcessingContexts = {};
	this.ProcessingContextsCount = 0;
	if (!timeout) timeout = 5000;
	this.timeout = timeout;
    if (port){
        this.port = port;
        var http = useSystem('http');
        this.server = http.createServer((req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
            if (req.method == 'OPTIONS'){
                res.statusCode = 200;
                res.end("OK");
                return;
            }
            var context = null;
            try{
                if (this.Enabled){
                    var serv = this;
                    var fullData = "";
                    if (this.noCollectData){
                        context = serv.GetContext(req, res);
                        serv.Process(context);
                    }
                    else{
                        req.on("data", function(data){
                            fullData += data;
                        });
                        req.on("end", function(){
                            context = serv.GetContext(req, res, fullData);
                            serv.Process(context);
                        });
                    }
                    return false;
                }
                else{
                    res.statusCode = 403;
                    res.end("Server disabled");
                }
            }
            catch (e){
                if (context){
                    context.error(e);
                }
                res.statusCode = 500;
                res.end(e.message);
                throw e;
            }
            return true;
        });
		this.server.listen(port);
	}
};

Router.prototype = {
    on : function(path, handler){
		var phase = "_default";
		return this["for"](phase, path, handler);
    },

    un : function(handler){
        var phase = "_default";
        if (!this.Handlers[phase]) return;
        return this._removeHandler(this.Handlers[phase], handler);
    },

	"for" : function(phase, path, handler){
		if (!this.Handlers[phase]){
			this.HandlersIndex.push(phase);
			this.Handlers[phase] = new MapNode("/");
		}
		return this._addHandler(this.Handlers[phase], path.toLowerCase(), handler);
	},
	
	map : function(phase, map){
		if (!this.Handlers[phase]){
			this.HandlersIndex.push(phase);
			this.Handlers[phase] = new MapNode("/");
		}
		if (map){
			for (var path in map){
				this._addHandler(this.Handlers[phase], path.toLowerCase(), map[path]);
			}
		}
	},
	
	GetContext: function(req, res, data){
		var context = new RoutingContext(req, res, this.basePath, data);
		context.debugMode = this.debugMode;
		return context;
	},
	
	Process: function(context){
		this.ProcessingContextsCount++;
		this.ProcessingContexts[context.id] = context;
		context.router = this;
		for (var i = 0; i < this.HandlersIndex.length; i++){
			var phase = this.HandlersIndex[i];
			context.phases.push(phase);
			context.callPlans[phase] = [];
			context.getCallPlan(context.callPlans[phase], this.Handlers[phase], 0);
			context.log("callPlan[", phase, "] : ", context.callPlans[phase].length);
		}	
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

RoutingContext = function(req, res, rootPath, data){
	this.id = (Math.random() + "").replace("0.", "");
	this.url = require('url').parse(req.url, true);
	this.hostname = this.url.hostname = req.headers.host;
	this.method = req.method;
	this.urlString = "http://" + req.headers.host + req.url;
	this.req = req;
	this.res = res;
	this.data = data;
	this.query = this.url.query;
	this.debugMode = req.headers["debug-mode"];
	this.logs = [];
    this.path = this.url.pathname;
	var pathname = this.url.pathname.toLowerCase();
	if (!pathname) pathname += "/";
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
		
		if (this.req.method == 'HEAD' || this.req.method == "OPTIONS"){
			return this._finishHead(status, result);
		}
		return this._finishBody(status, result);
	},	
	
	_finishHead : function(status, result){		
		//console.log("finishing head" + this.completed + " " + this.finalized);
		this.completed = true;
		this.res.writeHead(status, result + "");
		this.res.end();
	},
	
	_finishBody : function(status, result){
		//console.log("finishing body" + this.completed + " " + this.finalized);
		if (this.finalized) return;
		this.log("finish: ", new Date());
		this.completed = true;
		this.setHeader("Start", this.startTime.valueOf());
		this.setHeader("Finish", new Date().valueOf());
		this.setHeader("Load", (new Date() - this.startTime) + " ms");
		this.log("executing: ", (new Date() - this.startTime) + " ms");
		if (status != 200){
			this.setHeader("Content-Type", "text/plain; charset=utf-8");
            result = result + "";
            this.finalized = true;
		}
		this.res.statusCode = status;		
		if (this.debugMode && this.debugMode == "trace"){
			result = result + "\n\n" + this.formatLogs();		
		}		
		//this.res.setHeader("Content-Length", result.length);
        let contentType = "text/plain; charset=utf-8";
		if (!this.encoding){
			this.encoding = 'utf8';
		}
		else{
		    if (this.encoding == 'json'){
                contentType  = "application/json; charset=utf-8"
            }
        }
        if (typeof result != 'string'){
            if (typeof result == "function"){
                this.setHeader("Content-Type", "application/javascript; charset=utf-8");
                this.res.end(result.toSource(), this.encoding);
                this.finalized = true;
                return;
            }
            if (Buffer.isBuffer(result)){
                this.res.end(result, 'bin');
                this.finalized = true;
                return;
            }
            contentType = "application/json; charset=utf-8";
            result = JSON.stringify(result);
        }
        this.setHeader("Content-Type", contentType);
        this.finalized = true;
        this.res.end(result, this.encoding);
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
			if (!this.res.headersSent){
				this.setHeader("Access-Control-Allow-Origin", "*");
				this.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
				this.setHeader("Access-Control-Allow-Headers", "debug-mode");
				this.setHeader("Content-Type", "text/plain; charset=utf-8");
				this.log("end: ", new Date());
			}
			this.abort();
			this.res.statusCode = 500;
			this.res.end(this.formatError(error));			
		}
		else{
			console.error("UNEXPECTED ROUTER ERROR!");
			console.error(error);
		}
	},
}

module.exports = Router;