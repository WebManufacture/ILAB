var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');
var utils = useModule('utils');
var Selector = useModule('selectors');
var Router = useModule('Router');
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
    this.handlers = [];
    this.selectors = [];
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

RoutingMessage = function (from, to, data) {
    this.id = (Math.random() + "").replace("0.", "");
    this.data = data;
    this.source = {
        from: from,
        to : to
    }
    this.from = Selector.Parse(from);
    this.to = Selector.Parse(to);
    this._creationTime = new Date();
};

Inherit(XRouter, {
    on: function (selector, handler) {
        return this;
    },

    un: function (selectorOrHandler) {
        return this;
    },

    route: function (message){

        return this;
    },

    send: function (selector, data) {
        return this.route(new RoutingMessage(new Selector(this), selector, data));
    }
});


module.exports = XRouter;
