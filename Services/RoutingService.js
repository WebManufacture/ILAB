var Service = useRoot("/System/Service.js");
useModule("utils.js");
var Router = useModule('Router');


function RoutingService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = {};

    this.GetKnownNodes = function() {
        var nodes = [];
        for (var item in this.knownNodes){
            nodes.push(this.knownNodes[item]);
        }
        return nodes;
    };
    this.RegisterNode = function(info){
        return this.registerNode(info);
    };

    var result = Service.apply(this, arguments);

    this.registerNode({
        id: this.serviceId,
        type: "self",
        rank: 2,
        serviceType: "DiscoveryService",
        tcpPort: this.port
    });

    ServicesManager.GetServicesInfo().then((services)=>{
        services.forEach((service)=> {
            this.registerNode({
                id: service.resultId,
                type: "local",
                rank: 6,
                serviceType: service.serviceType,
                tcpPort: service.port
            });
        });
    });

    ServicesManager.on("service-started", (serviceId, servicePort, config) => {
        this.registerNode({
            id: serviceId,
            type: "local",
            rank: 5,
            serviceType: config.serviceType,
            tcpPort: servicePort
        });
    });

    ServicesManager.on("service-exited",(serviceId, servicePort) => {
        delete this.knownNodes[serviceId];
    });

    return result;
}

RoutingService.serviceId = "DiscoveryService";

Inherit(RoutingService, Service, {

    registerNode : function(nfo){
        if (nfo && nfo.id){
            var existing = this.knownNodes[nfo.id];
            if (!existing) {
                Frame.log("registered node " + nfo.type + ":" + nfo.serviceType + "#" + nfo.id);
                this.knownNodes[nfo.id] = nfo;
                return true;
            } else {
                if (existing.rank > nfo.rank) {
                    Frame.log("replacing node " + nfo.id + " from " + existing.rank + ":" + existing.type + ":" + existing.parentId + " to " + nfo.rank + ":" + nfo.type + "#" + (nfo.parentId ? nfo.parentId : nfo.id));
                    this.knownNodes[nfo.id] = nfo;
                    return true;
                }
            }
        }
        return false;
    },
});

module.exports = RoutingService;