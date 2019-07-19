var Service = useSystem("Service");
useModule("utils.js");
var XRouter = useSystem('XRouter');


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

    this.router = new XRouter();
    this.router.addRoute({
        id : this.serviceId,
        rank: 100,
        provider: this.routeDefault.bind(this)
    });
    this.router.addRoute({
        id: process.id,
        rank: 10,
        provider: process.router.routeMessage.bind(process.router)
    });
    //Register default router
    this.router.addRoute({
        id: '',
        rank: 10,
        provider: process.router.routeMessage.bind(process.router)
    });


    var route = {
        id: this.serviceId,
        type: this.serviceType,
        rank: 10,
        provider: this.router.routeMessage.bind(this.router)
    };
    process.router.addRoute(route);

    return Service.apply(this, arguments);
}

Inherit(RoutingService, Service, {

});

module.exports = RoutingService;
