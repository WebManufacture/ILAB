var Service = useSystem("Service");
useModule("utils.js");
var Router = useModule('Router');


function RoutingService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = [];
    this.myRecheckHash = Math.random();

    this.GetKnownNodes = () => {
        this.knownNodes.checkHash = this.myRecheckHash;
        return this.knownNodes.sort((a, b) => a.rank - b.rank);
    };

    this.RegisterNode = (info) => {
      return this.registerNode(info);
    };

    this.RegisterNodes = (nodes) => {
      const registered = [];
      if (Array.isArray(nodes)) {
          nodes.forEach((node) => {
              if (this.registerNode(node)){
                registered.push(node);
              };
          });
      }
      return registered;
    }

    this.CheckAlive = (obj) => {
       return this.knownNodes.findIndex(n =>
         n.rank < 10 && obj.id == n.id && (obj.localId ? n.localId == obj.localId : true))
       >= 0;
    }

    this.DeleteNode = (obj) => {
        const exId = this.getNodeIndex(obj);
        if (exId >= 0){
          this.myRecheckHash = Math.random();
          console.log("Died!", this.knownNodes[exId]);
          this.knownNodes.splice(exId, 1);
          return true;
        } else {
          return false;
        }
    };


    this.SetNodeRank = (obj, newRank) => {
        const exId = this.getNodeIndex(obj);
        if (exId >= 0){
          this.myRecheckHash = Math.random();
          console.log("Died!", this.knownNodes[exId]);
          this.knownNodes[exId].rank = newRank;
          return true;
        }
        return false;
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
        tcpPort: this.port,
        localId: (Math.random() + "").replace("0.", "")
    });

    ServicesManager.GetServicesInfo().then((services)=>{
          services.forEach((service)=> {
              if (service.serviceType == "RoutingService" && service.resultId == this.serviceId){
                  return;
              }
              if (!this.knownNodes.find(n => n.rank <= 5 && n.id == service.resultId && n.serviceType == service.serviceType)){
                  this.registerNode({
                    id: service.resultId,
                    type: "local",
                    rank: 5,
                    serviceType: service.serviceType,
                    tcpPort: service.port,
                    localId: (Math.random() + "").replace("0.", "")
                });
              }
        });
    });

    ServicesManager.on("service-started", (serviceId, config, description) => {
        if (service.serviceType == "RoutingService" && serviceId == this.serviceId){
            return;
        }
        if (!this.knownNodes.find(n => n.rank <= 5 && n.id == serviceId && n.serviceType == description.serviceType)){
          this.registerNode({
              id: serviceId,
              type: "local",
              rank: 5,
              serviceType: description.serviceType,
              tcpPort: description.tcpPort,
              localId: (Math.random() + "").replace("0.", "")
          });
        }
    });


    ServicesManager.on("service-exited",(serviceId, servicePort) => {
        const ind = this.knownNodes.findIndex((item) => item && item.id == serviceId && item.rank < 10);
        if (ind >= 0) {
          this.myRecheckHash = Math.random();
          this.knownNodes.splice(ind, 1);
        }
    });

    setInterval(()=>{
        var count = 0;
        var nodeInd;
        while ((nodeInd = this.knownNodes.findIndex(n => n.rank > 100)) >= 0){
          this.myRecheckHash = Math.random();
          this.knownNodes.splice(nodeInd, 1);
          count++;
        }
        console.log("Removed " + count + " nodes");
    }, 120000)


    return result;
}

Inherit(RoutingService, Service, {

      getNodeIndex: function(obj){
        return this.knownNodes.findIndex(n =>
          obj.id == n.id && ((obj.localId ? n.localId == obj.localId : true) || (n.rank < 10 && obj.rank < 10)))
      },

      registerNode : function(nfo){
          if (nfo && nfo.id){
              var existingInd = this.getNodeIndex(nfo);
              /*if (this.routerId) {
                  this.routeLocal(this.routerId, {
                      type: "method",
                      name: "RegisterNode",
                      args: [{
                          id: nfo.id,
                          rank: 60,
                          type: "routed",
                          providerId: this.serviceId,
                          serviceType: nfo.serviceType,
                          data: nfo
                      }]
                  });
              }*/
              if (existingInd < 0) {
                  if (!nfo.localId){
                    console.log("Registering service without localID!", nfo);
                    nfo.localId = (Math.random() + "").replace("0.", "");
                  }
                  this.myRecheckHash = Math.random();
                  Frame.log("registered node " + nfo.localId + " - " + nfo.rank + ":" + nfo.type + ":" + nfo.serviceType + "#" + nfo.id);
                  this.knownNodes.push(nfo);
                  return true;
              } else {
                  var existing = this.knownNodes[existingInd];
                  if (existing && existing.rank > nfo.rank && existing.rank <= 100) {
                      if (!nfo.localId){
                        console.log("Replacing service without localID!", nfo);
                        nfo.localId = (Math.random() + "").replace("0.", "");
                      }
                      this.myRecheckHash = Math.random();
                      Frame.log("replacing node " + existing.localId + " -> " + nfo.localId + " - " + nfo.id + " from " + existing.rank + ":" + existing.type + ":" + existing.parentId + " to " + nfo.rank + ":" + nfo.type + "#" + (nfo.parentId ? nfo.parentId : nfo.id));
                      this.knownNodes[existingInd] = nfo;
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
