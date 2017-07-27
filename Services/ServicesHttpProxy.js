var fs = useSystem('fs');
var http = useSystem('http');
var EventEmitter = useSystem('events');
var HttpRouter = useModule('Router');
var Service = useRoot("/System/Service.js");

HttpProxyService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    this.listServices();
    var port = 5000;
    if (params && params.port) port = params.port;
    this.router = new HttpRouter(port, 15000);
    //this.router.debugMode = "trace";
    this.router.on("/<", (context) => {
        context.error("No service found " + context.path, 404);
    });
    this.router.on("/", (context) => {
        context.finish(self.services);
    });
    ServicesManager.on("service-started", function (serviceId, servicePort) {
        console.log("HttpProxy got service: " + serviceId);
        self.services[serviceId] = servicePort;
        self.addServiceHandler(serviceId, servicePort);
    })
    console.log("HTTP PROXY ON " + this.router.port);
    return result;
};

HttpProxyService.serviceId = ("ServicesHttpProxy");

Inherit(HttpProxyService, Service, {
    listServices : function () {
        var self = this;
        ServicesManager.GetServices().then((services) => {
            console.log("HttpProxy got services");
            console.log(services);
            self.services = services;
            for (var service in services){
                self.addServiceHandler(service, services[service]);
            }
        }).catch(function (err) {
            throw err;
        });
    },

    addServiceHandler : function (name, port) {

        this.router.on("/" + name, (httpContext) => {
            httpContext.res.setHeader("Content-Type", "text/json");
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
            context.res.setHeader("Content-Type", "text/json");
            ServicesManager.GetService(name).then((service) => {
                console.log(name + "." + context.nodeName + " method calling ");
                var method=service[context.nodeName];
                if (method){
                    var args = context.tail.split("/");
                    args.shift();
                    if (!context.data) context.data = "[]";
                    var data = JSON.parse(context.data);
                    if (data && data.length){
                        args = args.concat(data);
                    }
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
});

module.exports = HttpProxyService;