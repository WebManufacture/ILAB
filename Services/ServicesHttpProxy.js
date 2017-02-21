var fs = useSystem('fs');
var http = useSystem('http');
var EventEmitter = useSystem('events');
var HttpRouter = useModule('Router');
var Service = useRoot("/System/Service.js");

HttpProxyService = function(params){
    var result = Service.apply(this, arguments);
    this.listServices();
    var port = 5000;
    if (params && params.port) port = params.port;
    this.router = new HttpRouter(port, 15000);
    //this.router.debugMode = "trace";
    this.router.on("/<", (context) => {
        context.error("No service found " + context.path, 404);
    });
    console.log("HTTP PROXY ON " + this.router.port);
    return result;
};

HttpProxyService.serviceId = ("ServicesHttpProxy");

Inherit(HttpProxyService, Service, {
    listServices : function () {
        ServicesManager.GetServices().then((services) => {
            console.log("HttpProxy got services");
            console.log(services);
            this.services = services;
            for (var service in services){
                this.addServiceHandler(service, services[service]);
            }
            this.router.on("/", (context) => {
                context.finish(this.services);
            });
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