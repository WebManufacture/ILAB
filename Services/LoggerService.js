var fs = useSystem('fs');
var Service = useModule('Service');
var ServiceProxy = useModule('ServiceProxy');

LoggerService = function (port) {
    // console.log("Logger service on port %d", port);
    return Service.apply(this, arguments);
};

Inherit(LoggerService, Service, {});

module.exports = LoggerService;