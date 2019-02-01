var Service = useRoot("/System/Service.js");
useModule("utils.js");
var Router = useModule('Router');


function RoutingService(config){
    var self = this;
    var result = Service.apply(this, arguments);

    return result;
};

Inherit(RoutingService, Service, {


});

module.exports = RoutingService;