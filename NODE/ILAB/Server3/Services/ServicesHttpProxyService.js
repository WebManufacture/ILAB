var fs = useSystem('fs');
var Service = useModule('Service');

HttpProxyService = function(port){

    return Service.apply(this, arguments);
};

Inherit(HttpProxyService, Service, {

});

module.exports = HttpProxyService;