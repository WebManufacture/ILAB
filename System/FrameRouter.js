var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var vm = require('vm');
var ChildProcess = require('child_process');

Frame.routeTable = [];

/*
Node should have next fields:
 id, type
 rank (like metric)
 providerId (like channel, like default gateway)

Types:
 1. self -- Link to the self service
 2. local -- addressed by IPC
 3. direct -- can be pointed directly from this node
 4. routed -- should be redirected to another node


Node may have another fields:
  tags - a tags string
  classes - a classes array
  serviceType - a service type for filtering
  data -- object which can be used for storing additional info (like address, port)
 */

/*
    Message should contains next fields

    destination -- Receiver selector
    source -- source selector
    *to -- id of destination node //if it is unicast packet
    *from -- id of source node //if it is regular service
    content -- content object of message
 */

/*
Packet types

XRoutingPacket.TYPE_HI       = {};
XRoutingPacket.TYPE_LOOKUP   = {};
XRoutingPacket.TYPE_SEEYOU   = {}; //
XRoutingPacket.TYPE_BYE      = {}; //
XRoutingPacket.TYPE_FOLLOW   = {};
XRoutingPacket.TYPE_UPGRADE  = {};
XRoutingPacket.TYPE_SUBSCRIBE= {};
XRoutingPacket.TYPE_UNSUBSCR = {};

XRoutingPacket.TYPE_GET      = {};
XRoutingPacket.TYPE_SET      = {};
XRoutingPacket.TYPE_SEARCH   = {}; //ALL
XRoutingPacket.TYPE_ADD      = {};
XRoutingPacket.TYPE_DEL      = {};
XRoutingPacket.TYPE_CALL     = {};
*/

Frame._routeMessageInternal = function(message, hope){

};

Frame.routeMessage = function(message){
    if (message.to == Frame.id){
        process.emit("self-message", message.content);
        return;
    }
    if (message.to){
        //Unicast message
        var route = Frame.routeTable.find(r => r.id == message.to);
        if (route){
            if (route.providerId == "self"){
                process.emit("self-message", message.content);
                return;
            }
            if (route.providerId == "child"){
                var child = Frame.getChild(message.to);
                if (child) {
                    child.send(message);
                } else {
                    console.log("routing to unreachable child node " + message.to);
                }
                return;
            }
            console.log("Route with unknown routing type " + route.id + ":" + route.type + " --> " + route.providerId);
        } else {
            if (Frame.isChild) {
                //Should route to uplink
                Frame.send({
                    type: "message",
                    message: message
                });
            } else {
                //Let's check by node type
                //Should route to default router
                var route = Frame.routeTable.find(r => r.id == message.to);
            }
        }
    } else {
        //Multicast message
    }
};

Frame.addNode = function(node){
    if (node) {
        if (typeof node == "object" && node.id) {
            process.emit("created-route", node);
            Frame.routeTable.push(node);
            //Frame.log("Added route: " + node.id + " across " + node.providerId);
        } else {
            //Frame.log("Try to add route without id" + node.id);
        }
    }
};

Frame.removeNode = function(nodeId){
    if (!nodeId) return;
    if (typeof nodeId == "object") nodeId = nodeId.id;
    var nodeIndex = Frame.routeTable.findIndex(r => r.id == nodeId);
    if (nodeIndex >= 0){
        var node = Frame.routeTable[nodeIndex];
        process.emit("removed-route", node);
        //Frame.log("Removed route: " + node.id + " across " + node.providerId);
        Frame.routeTable.splice(nodeIndex, 1);
    } else {
        //Frame.log("Node " + nodeId + " not found in routing");
    }
};

process.on("message", (message) => {
    Frame.routeMessage(message);
});

process.on("child-message", (cp, message) => {
    Frame.routeMessage(message);
});

process.on("child-started", (cp, message)=>{
    var node = Frame.routeTable.find(r => r.id == cp.id);
    if (node && node.providerId == "child"){
        node.rank = 20;
    } else {
        Frame.addNode({
            id: message.serviceId,
            type: message.serviceType,
            providerId: "child",
            rank: 20
        });
    }
});

process.on("child-renaming", (cp, newId)=>{
    if (cp && cp.id) {
        Frame.removeNode(cp.id);
    }/*
    var node = Frame.routeTable.indexOf(r => r.id == cp.id);
    if (node && node.providerId == "child"){
        node.rank = 100;
    }*/
});

process.on("child-renamed", (cp, oldId)=>{
    if (cp && cp.id) {
        Frame.addNode({
            id: cp.id,
            type: cp.serviceType,
            providerId: "child",
            rank: 20
        });
    }/*
    var node = Frame.routeTable.indexOf(r => r.id == cp.id);
    if (node && node.providerId == "child"){
        node.rank = 100;
    }*/
});

process.on("child-exited", (cp)=>{
    Frame.removeNode(cp.id);/*
    var node = Frame.routeTable.indexOf(r => r.id == cp.id);
    if (node && node.providerId == "child"){
        node.rank = 100;
    }*/
});