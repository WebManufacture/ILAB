var Service = useRoot("/System/Service.js");
useModule("utils.js");
var Router = useModule('Router');


function RoutingService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = [];

    this.GetKnownNodes = function() {
        return this.knownNodes;
    };

    this.RegisterNode = function(info){
        return this.registerNode(info);
    };

    this.RoutePacket = function(packet){
        this.route(packet)
    };

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

    var result = Service.apply(this, arguments);

    this.registerNode({
        id: this.serviceId,
        type: "self",
        rank: 1,
        serviceType: "RoutingService",
        data: {
            tcpPort: this.port
        }
    });

    ServicesManager.GetServicesInfo().then((services)=>{
        services.forEach((service)=> {
            self.registerNode({
                id: service.resultId,
                type: "local",
                rank: 6,
                serviceType: service.serviceType,
                data: {
                    tcpPort: service.port
                }
            });
        });
    });

    ServicesManager.on("service-started", (serviceId, servicePort, config) => {
        self.registerNode({
            id: serviceId,
            type: "local",
            rank: 5,
            serviceType: config.serviceType,
            data: {
                tcpPort: servicePort
            }
        });
    });

    ServicesManager.on("service-exited",(serviceId, servicePort) => {
        var node = this.knownNodes.find(n => n.id == serviceId);
        if (node){
            node.rank = 100;
        }
    });

    return result;
}

Inherit(RoutingService, Service, {
    registerNode : function(nfo){
        if (nfo && nfo.id){
            var existing = this.knownNodes.find(n => n.id == nfo.id);
            var index = this.knownNodes.indexOf(n => n.id == nfo.id);
            if (!existing) {
                Frame.log("registered node " + nfo.type + ":" + nfo.serviceType + "#" + nfo.id);
                this.knownNodes.push(nfo);
                return true;
            } else {
                if (existing.rank > nfo.rank) {
                    Frame.log("replacing node " + nfo.id + " from " + existing.rank + ":" + existing.type + ":" + existing.parentId + " to " + nfo.rank + ":" + nfo.type + "#" + (nfo.parentId ? nfo.parentId : nfo.id));
                    this.knownNodes[index] = nfo;
                    return true;
                }
            }
        }
        return false;
    },

    route: function (packet, id) {
        if (!id) id = packet.to;
        if (packet && packet.to) {
            var node = this.knownNodes.sort((a,b) => a.rank - b.rank).indexOf(n => n.id == id);
            if (node){
                switch (node.type){
                    case "self" : {
                        this.routeInternal(packet);
                    }
                    case "local": {
                        //var socket = new JsonSocket(node.data.tcpPort, "127.0.0.1", function (err) {
                        var socket = new JsonSocket(Frame.getPipe(node.parentId), function (err) {
                            //console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
                            try {
                                socket.write(packet);
                                socket.end();
                            }
                            catch(err){
                                console.error(err);
                            }
                        });
                    }
                    case "direct": {
                        var socket = new JsonSocket(node.data.tcpPort, node.data.address, function (err) {
                            //console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
                            try {
                                socket.write(packet);
                                socket.end();
                            }
                            catch(err){
                                console.error(err);
                            }
                        });
                    }
                    case "routed": {
                        this.route(packet, node.providerId);
                    }
                }
            }
        }
    }
});

module.exports = RoutingService;