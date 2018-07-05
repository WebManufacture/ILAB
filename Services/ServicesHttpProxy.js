var fs = useSystem('fs');
var http = useSystem('http');
var stream = useSystem('stream');
var EventEmitter = useSystem('events');
var HttpRouter = useModule('Router');
var Service = useRoot("/System/Service.js");

HttpProxyService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    this.services = {};
    this.listServices();
    var port = 5100;
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
        console.log("HttpProxy catch service start: " + serviceId + ":" + servicePort);
        self.services[serviceId] = servicePort;
        self.addServiceHandler(serviceId, servicePort);
    });
    ServicesManager.on("service-exited", function (serviceId, servicePort) {
        console.log("HttpProxy catch service exited: " + serviceId + ":" + servicePort);
        delete self.services[serviceId];
        self.removeServiceHandler(serviceId, servicePort);
    });
    console.log("HTTP PROXY ON " + this.router.port);


    process.once('exiting', () => {
        self.router.close();
    });
    process.once('exit', () => {
        self.router.close();
    });
    return result;
};

HttpProxyService.serviceId = ("ServicesHttpProxy");

Inherit(HttpProxyService, Service, {
    listServices : function () {
        var self = this;
        ServicesManager.GetServices().then((services) => {
            console.log("HttpProxy got services: " + JSON.stringify(services));
            self.services = services;
            for (var service in services){
                self.addServiceHandler(service, services[service]);
            }
        }).catch(function (err) {
            throw err;
        });
    },

    addServiceHandler : function (name, port) {
        var proxy = new ServiceProxy(name);

        function callMethod(context) {
            console.log(name + "." + context.nodeName + " method calling ");
            var method = proxy[context.nodeName];
            if (method) {
                var args = context.tail.split("/");
                args.shift();
                for (var i = 0; i < args.length; i++){
                    args[i] = decodeURIComponent(args[i]);
                }
                if (!context.data) context.data = "[]";
                var data = JSON.parse(context.data);
                if (data && data.length) {
                    args = args.concat(data);
                }
                return method.apply(proxy, args).then(function (result) {
                    if (result && (result instanceof stream.Readable || result instanceof stream.Writable)) {
                        context.setHeader("Content-Type", "text/plain; charset=utf8");
                        result.setEncoding("utf8");
                        result.pipe(context.res);
                        context.abort();
                    }
                    else {
                        context.finish(result);
                    }
                }).catch((err) => {
                    context.error(err);
                })
            }
            else {
                context.error("Method " + context.current + context.tail + " not applying to service " + name);
            }
        }

        this.router.on("/" + name, (httpContext) => {
            httpContext.res.setHeader("Content-Type", "text/json");
            proxy.attach(port, "localhost", (proxyObj) => {
                httpContext.finish(proxyObj);
            }).catch((err) => {
                console.log(err);
                httpContext.error(err);
            });
            return false;
        });
        this.router.on("/" + name + "/<", (context) => {
            context.res.setHeader("Content-Type", "text/json; charset=utf8");
            if (proxy.attached){
                callMethod(context);
            }
            else{
                proxy.attach(port, "localhost", (proxyObj) => {
                    return callMethod(context);
                }).catch((err) => {
                    console.log(err);
                    httpContext.error(err);
                });
            }
            return false;
        });
    },


    removeServiceHandler : function (name, port) {
        //this.router.un();
    }
});

module.exports = HttpProxyService;