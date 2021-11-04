var fs = useSystem('fs');
var Service = useModule('Service');
var ServiceProxy = useModule('ServiceProxy');

LoggerService = function(port){
    
    return Service.apply(this, arguments);
};

Inherit(LoggerService, Service, {

});

module.exports = LoggerService;