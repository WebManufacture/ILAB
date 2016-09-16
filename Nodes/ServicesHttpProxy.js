var fs = useSystem('fs');
var http = useSystem('http');
var EventEmitter = useSystem('events');
var ServiceProxy = useModule('ServiceProxy');
var HttpRouter = useModule('Router');

HttpProxyService = function(port){
    var result = EventEmitter.apply(this, arguments);
    ServiceProxy.init().then((serviceManagerInstance) => {
        console.log("HttpProxy attached to ServiceManager - " + serviceManagerInstance.port);
        this.listServices();
    });
    this.router = new HttpRouter(port, 15000);
    //this.router.debugMode = "trace";
    this.router.on("/<", (context) => {
        context.finish("No service found " + context.path);
    });
    console.log("HTTP PROXY ON " + this.router.port);
    return result;
};

Inherit(HttpProxyService, EventEmitter, {
    listServices : function () {
        ServiceProxy.GetServices().then((services) => {
            console.log("HttpProxy got services");
            console.log(services);
            this.services = services;
            for (var service in services){
                this.addServiceHandler(service, services[service]);
            }
            this.router.on("/", (context) => {
                context.finish(this.services);
            });
        });
    },

    addServiceHandler : function (name, port) {

        this.router.on("/" + name, (httpContext) => {
            var proxy = new ServiceProxy(name);
            proxy.attach(port, "localhost", (proxyObj) => {
                httpContext.finish(proxyObj);
            }).catch((err) => {
                console.log(err);
                httpContext.error(err);
            });
            return false;
        });
        this.router.on("/" + name + "/<", (context) => {
            ServiceProxy.GetService(name).then((service) => {
                console.log(name + "." + context.nodeName + " method calling ");
                var method=service[context.nodeName];
                if (method){
                    var args = context.tail.split("/");
                    args.shift();
                    return method.apply(service, args).then((result) => {
                        context.finish(result);
                    }).catch((err)=>{
                        context.error(err);
                    })
                }
                else{
                    context.error("Method " + context.current + context.tail + " not applying to service " + name);
                }
            }).catch((err) => {
                console.log(err);
                context.error(err);
            });
            return false;
        });
    },

    connectService : function (port, host) {
        var proxy = new ServiceProxy();
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