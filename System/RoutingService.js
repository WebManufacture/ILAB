var Service = useSystem("Service");
useModule("utils.js");
var Router = useModule('Router');


function RoutingService(config){
    var self = this;
    // это публичная функция:

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
    /*
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
    */


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
    return result;
}

Inherit(RoutingService, Service, {

});

module.exports = RoutingService;