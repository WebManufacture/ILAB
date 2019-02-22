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
    source -- source selector
    type -- message type (see XRouter.TYPE_)

    it may also contains
    content -- content object of message
    hopes - decremental hopes
*/


function XRouter(){
    this.routeTable = [];
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


Inherit(XRouter, {
    routeMessage : function(message){
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

    addRoute : function(node){
        if (node) {
            if (typeof node == "object" && node.id) {
                process.emit("created-route", node);
                process.routeTable.push(node);
                //process.log("Added route: " + node.id + " across " + node.providerId);
            } else {
                //process.log("Try to add route without id" + node.id);
            }
        }
    },

    removeRoute : function(nodeId){
        if (!nodeId) return;
        if (typeof nodeId == "object") nodeId = nodeId.id;
        var nodeIndex = process.routeTable.findIndex(r => r.id == nodeId);
        if (nodeIndex >= 0){
            var node = process.routeTable[nodeIndex];
            process.emit("removed-route", node);
            //process.log("Removed route: " + node.id + " across " + node.providerId);
            process.routeTable.splice(nodeIndex, 1);
        } else {
            //process.log("Node " + nodeId + " not found in routing");
        }
    }
});

module.exports = XRouter;