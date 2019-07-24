var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');
var utils = useModule('utils');
var Selector = useModule('selectors');
var Router = useModule('Router');

/*
Node should have next fields:
 id,
 rank (like metric)
 provider (like channel, like default gateway, or function)


provider should be link to provider or function
it may also contains ID or one of the follows:
 1. self -- Link to the self service
 2. frame -- addressed in the frame
 3. pipe -- addressed by IPC
 3. local -- addressed by Pipes
 4. direct -- can be pointed directly from this node
 5. routed -- should be redirected to another node

Node may have another fields:
  type - contains types selector
  tags - a tags string
  classes - a classes array
  serviceType - a service type for filtering
  data -- object which can be used for storing additional info (like address, port)
 */
/*

- алгоритм поиска ресурсов по ключам;
- метод широкого первичного поиска (Breadth First Search);
- метод случайного широкого первичного поиска (Random Breadth First Search);
- интеллектуальный поисковый механизм (Intelligent Search Mechanism);
- метод "большинства результатов по прошлой эвристике" (>RES);
- алгоритм "случайных блужданий" (Random Walkers Algorithm).

*/
/*
    Message should contains next fields

    id -- message id (time + random generator is ok)
    destination -- Receiver selector
    source -- source selector,
    sender -- a node Id which are sends a message.
    type -- message type (see XRouter.TYPE_)

    it may also contains
    content -- content object of message
    jumps - decremental hopes
*/

//Аспекты передачи сообщений

function MapNode(parentPath) {
    this["/"] = [];
    this["<"] = [];
    this[">"] = [];
    this["//"] = parentPath;
};

function XRouter() {
    this.HandlersIndex = [];
    this.Handlers = new MapNode("/");
    this.basePath = "";
    this.Enabled = true;
    this.WaitingContexts = {};
    this.WaitingContextsCount = 0;
    this.ProcessingContexts = {};
    this.ProcessingContextsCount = 0;
    if (!timeout) timeout = 5000;
    this.timeout = timeout;
}

XRouter.TYPE_HI = "hi";        //used when new node up
XRouter.TYPE_LOOKUP = "lookup";    //used for node search
XRouter.TYPE_SEEYOU = "seeyou";    //response to lookup packet, or to hi packet
XRouter.TYPE_BYE = "bye";       //used when node down
XRouter.TYPE_REDIRECT = "redirect";  //used for subscriptions mechanism, will redirect the path to node
XRouter.TYPE_FOLLOW = "follow";    //used for subscriptions mechanism, will translate the path to node

XRouter.TYPE_GET_TUNNEL = "get-tunnel";//used for streaming, or direct containers communication
XRouter.TYPE_AUTO = "auto";      //used for auto-routing
XRouter.TYPE_LIVE = "live";      //used for "live" messages (which code should run on each route point)
XRouter.TYPE_RESPONSE = "response";  //used for streaming, or direct containers communication

XRouter.TYPE_CALL = "call";      //used for RPC
XRouter.TYPE_GET = "get";       //used for RPC
XRouter.TYPE_SET = "set";       //used for RPC
XRouter.TYPE_ALL = "all";       //used for RPC
XRouter.TYPE_SEARCH = "all";       //used for RPC
XRouter.TYPE_ADD = "add";       //used for RPC
XRouter.TYPE_DEL = "del";       //used for RPC

XRouter.TYPE_ERROR = "error";     //used for QOS
XRouter.TYPE_FATAL = "fatal";     //used for QOS
XRouter.TYPE_DENIED = "denied";    //used for QOS
XRouter.TYPE_TRACE = "trace";     //used for QOS
XRouter.TYPE_NOTFOUND = "notfound";  //used for QOS
XRouter.TYPE_CLOSED = "closed";    //used for QOS


Inherit(XRouter, {
    on: function (path, handler) {
        return this._addHandler(path.toLowerCase(), handler);
    },

    un: function (handler) {
        return this._removeHandler(handler);
    },

    map: function (map) {
        if (map) {
            if (Array.isArray(map)) {
                for (let path of map) {
                    this._addHandler(path.toLowerCase(), map[path]);
                }
            } else {
                for (let path in map) {
                    this._addHandler(path.toLowerCase(), map[path]);
                }
            }
        }
    },

    GetContext: function (selector, data) {
        var context = new RoutingContext(selector, this.basePath, data);
        context.debugMode = this.debugMode;
        return context;
    },

    do: function (selector, data) {
        return this.Process(this.GetContext(selector, data));
    },

    Process: function (context) {
        this.ProcessingContextsCount++;
        this.ProcessingContexts[context.id] = context;
        context.router = this;
            context.callPlan = [];
            context.getCallPlan(context.callPlan, this.Handlers, 0);
            context.log("callPlan: ", context.callPlan.length);
        context.callChain(0);
        return context;
    },


    _removeHandler: function (handler) {
        const root = this.Handlers;
        if (!handler) {
            return null;
        }
        for (var key in root) {
            if (typeof root[key] == "object") {
                if (root[key] instanceof Array) {
                    var arr = root[key];
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i] === handler) {
                            arr.splice(i, 1);
                            return;
                        }
                    }
                } else {
                    this._removeHandler(root[key], handler);
                }
            }
        }
    },

    _addHandler: function (path, handler) {
        const root = this.Handlers;
        if (!handler) {
            return null;
        }
        if (!path || path == '') path = '/';
        if (!path.start("/")) path = '/' + path;
        var parts = path.split('/');
        parts.shift();
        var lastPart = parts[parts.length - 1];
        if (lastPart == "<") {
            parts = parts.slice(0, parts.length - 1);
            return this._addHandlerInternal(root, parts, handler, '<');
        }
        if (lastPart == ">") {
            parts = parts.slice(0, parts.length - 1);
            return this._addHandlerInternal(root, parts, handler, '>');
        }
        return this._addHandlerInternal(root, parts, handler, '/');
    },

    _addHandlerInternal: function (root, parts, handler, endHandlerSymbol) {
        //console.log("calling addhandler! " + JSON.stringify(parts) + " " + endHandlerSymbol);
        var parentPath = root["//"];
        var cg = root;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p == "") {
                break;
            }
            parentPath = parentPath + p + "/";
            if (!cg[p + "/"]) {
                cg[p + "/"] = new MapNode(parentPath);
            }
            cg = cg[p + "/"];
        }
        var ch = cg[endHandlerSymbol];
        if (typeof (handler) == "object" && handler instanceof Array) {
            for (var i = 0; i < handler.length; i++) {
                ch.push(handler[i]);
            }
        } else {
            ch.push(handler);
        }
        return cg;
    },
});

RoutingContext = function (selector, rootPath, data) {
    this.id = (Math.random() + "").replace("0.", "");
    this.data = data;
    this.query = this.url.query;
    this.logs = [];
    this.path = selector;
    if (rootPath) {
        this.rootPath = rootPath.toLowerCase().substring(1).replace(">", "").replace("<", "");
        pathname = pathname.replace(this.rootPath, "");
    }
    this.paths = pathname.split('/');
    this.paths.shift();
    for (var i = 0; i < this.paths.length; i++) {
        var p = this.paths[i];
        if (p == "") {
            this.paths = this.paths.slice(0, i);
            break;
        }
        this.paths[i] = p + "/";
    }
    this.startTime = new Date();
    this.log("start: ", this.startTime);
    this.callPlan = {};
}

RoutingContext.phaseTimeout = 30;

Inherit(RoutingContext, {
    getCallPlan: function (callPlan, mapNode, pathNum) {
        if (!mapNode) {
            //this.log("CallPlan: Node not found");
            return;
        }
        this.getHandlers(callPlan, mapNode, mapNode[">"], ">", pathNum);
        if (pathNum < this.paths.length) {
            var path = this.paths[pathNum];
            this.getCallPlan(callPlan, mapNode[path], pathNum + 1);
        } else {
            this.getHandlers(callPlan, mapNode, mapNode['/'], "/", pathNum);
        }
        this.getHandlers(callPlan, mapNode, mapNode["<"], "<", pathNum);
    },

    getHandlers: function (callPlan, mapNode, handlers, path, pathNum) {
        var result = false;
        if (handlers && handlers.length > 0) {
            for (var g = 0; g < handlers.length; g++) {
                var handler = handlers[g];
                if (handler) {
                    if (typeof handler == 'function') {
                        this.log("CallPlanF ", pathNum, ": ", mapNode["//"], path);//  :", "\n   ", handler.toString());
                        var hobj = {};
                        hobj.handler = handler;
                        hobj.pathNum = pathNum;
                        hobj.node = mapNode;
                        hobj.path = mapNode["//"];
                        callPlan.push(hobj);
                        result = true;
                    }
                    if (typeof handler == 'object' && typeof handler[this.req.method] == 'function') {
                        this.log("CallPlanO ", pathNum, ": ", mapNode["//"], path);// :\n   ", handler[this.req.method].toString());
                        var hobj = {};
                        hobj.handler = handler[this.req.method];
                        hobj.owner = handler;
                        hobj.pathNum = pathNum;
                        hobj.node = mapNode;
                        hobj.path = mapNode["//"];
                        callPlan.push(hobj);
                        result = true;
                    }
                } else {
                    this.log("CallPlan ", pathNum, ": ", mapNode["//"], path, " NULL handler!");
                }
            }
        }
        return result;
    },

    callChain: function (phaseNum, numSpaces) {
        var context = this;
        if (!numSpaces) numSpaces = 0;
        var maxSpaces = 5000 / RoutingContext.phaseTimeout;
        if (this.router && this.router.timeout) {
            maxSpaces = this.router.timeout / RoutingContext.phaseTimeout;
        }
        if (!context.longPhase && numSpaces > maxSpaces) {
            this.finish(500, "Response timeout " + (maxSpaces * RoutingContext.phaseTimeout / 1000) + " seconds ");
            return;
        }
        if (this.completed) {
            this.log("RoutingContext completed");
            this.finishHandler(this);
            return;
        }
        if (this.phaseProcessed) {
            if (phaseNum < this.phases.length) {
                var phaseName = this.phases[phaseNum];

                this.callPlan = this.callPlans[phaseName];
                this.phaseProcessed = false;
                this.handlerNum = -1;
                //Тут должно произойти собственно выполнение найденных ф-й согласно плану вызовов.
                this.log("Phase ", phaseNum, "[", phaseName, "] Starting");
                var result = this.continue(this);
                this.log("Phase ", phaseNum, "[", phaseName, "] Called " + result);
                if (result) {
                    if (phaseNum + 1 < this.phases.length) {
                        this.callPhaseChain(phaseNum + 1, numSpaces + 1);
                    } else {
                        this.finishHandler(this);
                    }
                } else {
                    if (!this._aborted) {
                        if (this.router && !this.router.WaitingContexts[this.id]) {
                            this.router.WaitingContexts[this.id] = this;
                            this.router.WaitingContextsCount++;
                        }
                        this._currentTimeout = setTimeout(function () {
                            context.log("New Phase ", phaseNum, " [", context.phases[phaseNum], "] WAITING!", numSpaces);
                            context.callPhaseChain(phaseNum, numSpaces + 1);
                        }, RoutingContext.phaseTimeout);
                    } else {
                        this._abortProcessing();
                    }
                }
            } else {
                this.finishHandler(this);
            }
        } else {
            if (!this._aborted) {
                if (this.router && !this.router.WaitingContexts[this.id]) {
                    this.router.WaitingContexts[this.id] = this;
                    this.router.WaitingContextsCount++;
                }
                this._currentTimeout = setTimeout(function () {
                    context.log("Last Phase ", phaseNum, " [", context.phases[phaseNum], "] WAITING!", numSpaces);
                    context.callPhaseChain(phaseNum, numSpaces + 1);
                }, RoutingContext.phaseTimeout);
            } else {
                this._abortProcessing();
            }
        }
        this.log("Phase ", phaseNum, " Exited");
    },

    "continue": function () {
        var context = this;
        if (context.stop) {
            return true;
        }
        context.handlerNum++;
        if (context.handlerNum < context.callPlan.length) {
            var hobj = context.callPlan[context.handlerNum];
            context.nodePath = hobj.path.length > 1 ? hobj.path.slice(0, -1) : "/";
            context.node = (context.paths[hobj.pathNum]) ? context.paths[hobj.pathNum].slice(0, -1) : "";
            context.current = context.nodePath + "/" + context.node;
            context.nodeName = context.path.substr(context.nodePath == '/' ? 1 : context.nodePath.length + 1, context.node.length);
            context.prevNode = context.paths[hobj.pathNum - 1];
            if (context.prevNode) context.prevNode = context.prevNode.slice(0, -1);
            context.nextNode = context.paths[hobj.pathNum + 1];
            if (context.nextNode) context.nextNode = context.nextNode.slice(0, -1);
            context.tail = context.path.substr(context.current.length);
            context.log("Calling ", context.nodePath, ' with ', context.tailPath);
            try {
                if (hobj.owner) {
                    var result = hobj.handler.call(hobj.owner, context, context.continue);
                } else {
                    var result = hobj.handler(context, context.continue);
                }
                if (result == false) {
                    context.waiting = true;
                    return false;
                }
                if (context._aborted) {
                    context.phaseProcessed = true;
                    return false;
                }
            } catch (error) {
                context.phaseProcessed = true;
                context.error(error);
                context._finishWithError(error);
                return true;
            }
            return context.continue(context);
        } else {
            context.phaseProcessed = true;
            return true;
        }
    },

    abort: function () {
        this._aborted = true;
        clearTimeout(this._currentTimeout);
        if (this.router) {
            this.log("RoutingContext aborted");
            if (this.router.WaitingContexts[this.id]) {
                delete (this.router.WaitingContexts[this.id]);
                this.router.WaitingContextsCount--;
            }
            if (this.router.ProcessingContexts[this.id]) {
                delete (this.router.ProcessingContexts[this.id]);
                this.router.ProcessingContextsCount--;
            }
            delete (this.router);
        }
        delete (this.callPlans);

        if (this.finalized) return;
        this.finalized = true;
    },

    finish: function (status, result) {
        if (this.router) {
            if (this.router.WaitingContexts[this.id]) {
                delete (this.router.WaitingContexts[this.id]);
                this.router.WaitingContextsCount--;
            }
            if (this.router.ProcessingContexts[this.id]) {
                delete (this.router.ProcessingContexts[this.id]);
                this.router.ProcessingContextsCount--;
            }
            delete (this.router);
        }
        delete (this.callPlan);

        if (this.finalized) return;
        this.finalized = true;
    }
});

module.exports = XRouter;
