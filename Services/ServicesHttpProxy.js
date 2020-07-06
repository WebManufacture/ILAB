var fs = require('fs');
var http = require('http');
var stream = require('stream');
var EventEmitter = require('events');
var HttpRouter = useModule('HttpRouter');
var Service = useSystem("Service.js");

HttpProxyService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    this.services = {};
    this.listServices();
    var httpPort = 5100;
    if (params && params.httpPort) httpPort = params.httpPort;
    this.info("http-port", httpPort);


    var baseGetDescription = this.GetDescription;

    this.GetDescription = ()=>{
        var descr = baseGetDescription.apply(this, arguments);
        descr.httpPort = httpPort;
        return descr;
    }

    this.router = new HttpRouter(httpPort, 15000);
    //this.router.debugMode = "trace";
    this.router.on("/<", (context) => {
        //Frame.error("No service found " + context.path);
        context.error("No service found " + context.path, 404);
    });
    this.router.on("/", (context) => {
        try {
            context.finish(self.services);
        } catch (err){
            Frame.error(err);
            this.emit('error', err);
            context.error(err);
        }
        return false;
    });
    ServicesManager.on("service-started", function (serviceId, config, description) {
        console.log("HttpProxy catch service start: " + serviceId);
        self.services[serviceId] = description.tcpPort;
        self.addServiceHandler(serviceId, description.tcpPort);
        if (serviceId != description.serviceType){
            self.addServiceHandler(description.serviceType, description.tcpPort);
        }
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
                    Frame.error(err);
                    this.emit('error', err);
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
                //console.log(err);
                Frame.error(err);
                this.emit('error', err);
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
                    Frame.error(err);
                    this.emit('error', err);
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
