var utils = useModule('utils');
var Selector = useModule('selectors');
var EventEmitter = require('events');

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

function XRouter() {
    this.structure = {
        "*": {
            //there is will be utilization handlers for messages which have additional paths, but not equals any criterias
            undefined: [
                //utilization handlers
            ]
        },
        "#id": {
            undefined: [
                //end handlers
            ]
        },
        "CALL#12312213": {
            undefined: [
                //match handlers
            ]
        },
        undefined: [
            //end handlers
        ]
    };
}

Inherit(XRouter, EventEmitter, {
    on(selector, handler) {
        selector = new Selector(selector);
        if (selector.isRoot){
            //Имеет ли это значение тут
        }
        return this._subscribe(selector, this.structure, handler);
    },

    once: function (selector, handler) {
        selector = new Selector(selector);
        if (selector.isRoot){
            //Имеет ли это значение тут
        }
        return this._subscribe(selector, this.structure, (message, route, other)=>{
            handler.apply(this, arguments);
        });
    },

    _subscribe(selector, route, handler){
        var sel = undefined;
        if (!selector){
            if (!route[undefined]) route[undefined] = [];
            route[undefined].push(handler);
            return route;
        }
        if (selector.id){
            if (selector.type){
                sel = selector.type + "#" + selector.id;

            } else {
                sel = "#" + selector.id;
            }
            if (!route[sel]) route[sel] = { undefined : [] };
            return this._subscribe(selector.next, route[sel], handler);
        } else {
            if (selector.type){
                sel = selector.type;
                if (!route[sel]) route[sel] = { undefined : [] };
                return this._subscribe(selector.next, route[sel], handler);
            }
        }
        if (!route[undefined]) route[undefined] = [];
        route[undefined].push(handler);
        return route;
    },

    un: function (selectorOrHandler) {
        return this;
    },

    route: function (message, overrideTo){
        var selector = new Selector(overrideTo ? overrideTo : message.to);
        //console.log("Routing to: ", selector.source)
        if (selector.isRoot){
            if (!selector.type && !selector.id){
                return this._routeInternal(null, this.structure, message);
            }
        }
        return this._routeInternal(selector, this.structure, message);
    },

    _routeInternal: function (selector, route, message){
        var sel = '';
        if (selector){
            if (selector.id){
                if (selector.type){
                    sel = selector.type + "#" + selector.id;
                    if (route[sel]){
                        return this._routeInternal(selector.next, route[sel], message);
                    }
                }
                sel = "#" + selector.id;
                if (route[sel]){
                    return this._routeInternal(selector.next, route[sel], message);
                }
            }
            if (selector.type){
                sel = selector.type;
                if (route[sel]){
                    return this._routeInternal(selector.next, route[sel], message);
                }
            }
            if (route["*"]){
                return this._routeInternal(selector.next, route["*"], message);
            }
        }
        return this._callHandlers(message, route, selector);
    },

    _callHandlers: function (message, route, selector){
        for (var callback of route[undefined]){
            var result = callback(message, selector, route);
        }
        return true;
    },

    send: function (selector, data) {
        return this.route(new RoutingMessage(new Selector(this), selector, data));
    }
});

/*
    вообще-то есть другая модель
    TAKE
    GET
    SEARCH (LOOKUP)
*/

XRouter.TYPE_HI = "hi";        //used when new node up
XRouter.TYPE_LOOKUP = "lookup";    //used for node search and getting info
XRouter.TYPE_SEEYOU = "seeyou";    //response to lookup packet, or to hi packet
XRouter.TYPE_BYE = "bye";       //used when node down
XRouter.TYPE_REDIRECT = "redirect";  //used for subscriptions mechanism, will redirect the path to node
XRouter.TYPE_FOLLOW = "follow";    //used for subscriptions mechanism, will translate the path to node
XRouter.TYPE_UNSCRIBE = "unscribe";    //used for subscriptions mechanism, will translate the path to node

XRouter.TYPE_TUNNEL = "tunnel";  //used for streaming, or direct containers communication
XRouter.TYPE_AUTO = "auto";      //used for auto-routing
XRouter.TYPE_LIVE = "live";      //used for "live" messages (which code should run on each route point)

XRouter.TYPE_RESPONSE = "response";  //used for streaming, or direct containers communication
XRouter.TYPE_CALL = "call";      //used for RPC
XRouter.TYPE_EVENT = "event";      //used for RPC

XRouter.TYPE_GET = "get";       //used for RPC
XRouter.TYPE_SET = "set";       //used for RPC
XRouter.TYPE_ALL = "all";       //used for RPC
XRouter.TYPE_SEARCH = "all";       //used for RPC
XRouter.TYPE_ADD = "add";       //used for RPC
XRouter.TYPE_DEL = "del";       //used for RPC

XRouter.TYPE_INFO = "info";     //used for QOS
XRouter.TYPE_ERROR = "error";     //used for QOS
XRouter.TYPE_FATAL = "fatal";     //used for QOS
XRouter.TYPE_DENIED = "denied";    //used for QOS
XRouter.TYPE_TRACE = "trace";     //used for QOS
XRouter.TYPE_NOTFOUND = "notfound";  //used for QOS
XRouter.TYPE_CLOSED = "closed";    //used for QOS

RoutingMessage = function (from, to, data) {
    this.id = (Math.random() + "").replace("0.", "");
    this.data = data;
    this.from = new Selector(from);
    this.to = new Selector(to);
    this.selector = this.from.getLastNode();
    if (this.selector.id) this.id = this.selector.id;
    if (this.selector.type) this.type = this.selector.type;
    this.selector.from = from;
    this.selector.to = to;
    this._creationTime = new Date();
};

module.exports = XRouter;
