var fs = useSystem('fs');
var EventEmitter = useSystem('events');
var ServiceProxy = useModule('ServiceProxy');

HttpProxyService = function(port){
    var result = EventEmitter.apply(this, arguments);
    if (Frame.isChild){
        console.log("HttpProxy attaching to ServiceManager...");
        this.connectToManager(Frame.servicesManagerPort, "localhost")
    }
    return result;
};

Inherit(HttpProxyService, EventEmitter, {
    connectToManager : function (port, host) {
        var proxy = this.servicesManager = new ServiceProxy();
        var self = this;
        proxy.attach(port, host, function () {
            console.log("HttpProxy attached to services manager at " + port);
            self.emit("attached", proxy);
        });
    }
});

module.exports = function(){
    var proxy = new HttpProxyService(5000);
};