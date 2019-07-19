var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');
var utils = useModule('utils');
var Selector = useModule('selectors');

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


function XRouter(selector){
    if (selector) {
        selector = Selector.Parse(selector);
        this.id = selector.id;
        this.type = selector.type;
        this.tags = selector.tags;
        this.selector = selector;
    }

    //Роутер должен знать о своем селекторе (будь то контейнер или сервис)
    //Чтобы маршрутизировать широковещательные запросы себе или кому-то еще.

    this.routeTable = [];
    this.defaultHandlers = {};
    this.defaultHandlers[XRouter.TYPE_HI] = this._routeSystem.bind(this);
    this.defaultHandlers[XRouter.TYPE_LOOKUP] = this._routeLookup.bind(this);
    this.defaultHandlers[XRouter.TYPE_SEEYOU] = this._routeSystem.bind(this);
    this.defaultHandlers[XRouter.TYPE_BYE] = this._routeBye.bind(this);
    this.defaultHandlers[XRouter.TYPE_FOLLOW] = this._routeSystem.bind(this);
    this.defaultHandlers[XRouter.TYPE_REDIRECT] = this._routeSystem.bind(this);
    this.defaultHandlers[XRouter.TYPE_SUBSCRIBE] = this._routeSystem.bind(this);
    this.defaultHandlers[XRouter.TYPE_UNSCRIBE] = this._routeSystem.bind(this);

    this.defaultHandlers[XRouter.TYPE_GET] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_SET] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_ALL] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_SEARCH] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_ADD] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_DEL] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_CALL] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_RESPONSE] = this._routeDefault.bind(this);


    this.defaultHandlers[XRouter.TYPE_ERROR] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_FATAL] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_DENIED] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_TRACE] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_NOTFOUND] = this._routeDefault.bind(this);
    this.defaultHandlers[XRouter.TYPE_CLOSED] = this._routeDefault.bind(this);

    this.handlers = {};
    for (var name in this.defaultHandlers){
        this.handlers[name] = this.defaultHandlers[name];
    }
}

XRouter.TYPE_HI         = "hi";        //used when new node up
XRouter.TYPE_LOOKUP     = "lookup";    //used for node search
XRouter.TYPE_SEEYOU     = "seeyou";    //response to lookup packet
XRouter.TYPE_BYE        = "bye";       //used when node down
XRouter.TYPE_FOLLOW     = "follow";    //used to wrap messages
XRouter.TYPE_REDIRECT   = "redirect";  //used to unwrap messages
XRouter.TYPE_SUBSCRIBE  = "subscribe"; //used for subscriptions mechanism
XRouter.TYPE_UNSCRIBE   = "unscribe";  //used for subscriptions mechanism

XRouter.TYPE_GET        = "get";       //used for RPC
XRouter.TYPE_SET        = "set";       //used for RPC
XRouter.TYPE_ALL        = "all";       //used for RPC
XRouter.TYPE_SEARCH     = "all";       //used for RPC
XRouter.TYPE_ADD        = "add";       //used for RPC
XRouter.TYPE_DEL        = "del";       //used for RPC
XRouter.TYPE_CALL       = "call";      //used for RPC
XRouter.TYPE_RESPONSE   = "response";  //used for RPC

XRouter.TYPE_ERROR      = "error";     //used for QOS
XRouter.TYPE_FATAL      = "fatal";     //used for QOS
XRouter.TYPE_DENIED     = "denied";    //used for QOS
XRouter.TYPE_TRACE      = "trace";     //used for QOS
XRouter.TYPE_NOTFOUND   = "notfound";  //used for QOS
XRouter.TYPE_CLOSED     = "closed";    //used for QOS

XRouter.prototype = {
    replaceTypeHandler : function(messageType, handler){
        if (messageType && handler) {
            this.handlers[messageType] = handler;
        }
    },

    restoreTypeHandler : function(messageType){
        if (messageType && handler) {
            this.handlers[messageType] = this.defaultHandlers[messageType];
        }
    },

    _routeSystem : function(message, from){
        if (typeof message.jumps != "number"){
            message.jumps = 2;
        }
        if (message.jumps){
            message.jumps--;
            var source = Selector.Parse(message.source);
            switch (message.type) {
                case
                    XRouter.TYPE_BYE: this.removeRoute(source.id);
                    break;
                default: return this._routeDefault(message, from);
            }
        }
        return message;
    },

    _routeBye : function(message){
        this.removeRoute(message.source.id);
        return message;
    },

    _routeLookup: function(message, from){
        var dst = message.destination;
        if (dst.is(this.selector)){
            this.routeMessage({
                type: XRouter.TYPE_SEEYOU,
                destination : message.source,
                source: this.selector,
                sender: this.id
            });
        }

    },

    _routeRPC : function(message){
        return message;
    },

    _routeProblem : function(message){
        return message;
    },

    _routeDefault : function(message){
        if (message.to == process.id){
            process.emit("self-message", message.content);
            return message;
        }
        if (message.to){
            //Unicast message
            var route = process.routeTable.find(r => r.id == message.to);
            if (route){
                if (route.providerId == "self"){
                    process.emit("self-message", message.content);
                    return message;
                }
                if (route.providerId == "child"){
                    var child = process.getChild(message.to);
                    if (child) {
                        child.send(message);
                    } else {
                        console.log("routing to unreachable child node " + message.to);
                    }
                    return message;
                }
                console.log("Route with unknown routing type " + route.id + ":" + route.type + " --> " + route.providerId);
            } else {
                if (process.isChild) {
                    //Should route to uplink
                    process.send({
                        type: "message",
                        message: message
                    });
                } else {
                    //Let's check by node type
                    //Should route to default router
                    var route = process.routeTable.find(r => r.id == message.to);
                }
            }
        } else {
            //Multicast message
        }
        return message;
    },

    routeMessage : function(message){
        if (!message.id) { message.id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");}
        if (!message.type){ message.type = XRouter.TYPE_HI };
        if (typeof message.destination == "string"){
            message.destination = new Selector(message.destination);
        }
        if (typeof message.jumps != "number"){
            message.jumps = 2;
        } else {
            if (message.jumps) {
                message.jumps--;
            }
        }
        if (typeof message.source == "string"){
            message.source = new Selector(message.source);
        }
        //По умолчанию, мы смотрим от кого пришло сообщение и добавляем его в роуты
        if (message.sender && message.sender != this.id){
            this.addRoute({
                id : source.id,
                rank : 60,
                provider: message.sender
            });
        }
        var handler = this.handlers[message.type];
        if (!handler) handler = this.handlers[XRouter.TYPE_FOLLOW];
        return handler(message);
    },

    addRoute : function(node){
        if (node) {
            if (typeof node == "object" && node.id) {
                this.routeTable.push(node);
                process.emit("created-route", node);
                //process.log("Added route: " + node.id + " across " + node.providerId);
            } else {
                //process.log("Try to add route without id" + node.id);
            }
        }
    },

    removeRoute : function(nodeId){
        if (!nodeId) return;
        if (typeof nodeId == "object") nodeId = nodeId.id;
        var nodeIndex = this.routeTable.findIndex(r => r.id == nodeId);
        if (nodeIndex >= 0){
            var node = this.routeTable[nodeIndex];
            //process.log("Removed route: " + node.id + " across " + node.providerId);
            this.routeTable.splice(nodeIndex, 1);
            process.emit("removed-route", node);
        } else {
            //process.log("Node " + nodeId + " not found in routing");
        }
    }
};

module.exports = XRouter;
