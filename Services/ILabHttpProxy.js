var fs = require('fs');
var http = require('http');
var stream = require('stream');
var EventEmitter = require('events');
var HttpRouter = useModule('HttpRouter');
var Service = useSystem("Service.js");
var ServiceProxy = useSystem("ServiceProxy.js");

ILabHttpProxy = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    var httpPort = 5200;
    if (params && params.httpPort) httpPort = params.httpPort;
    this.info("http-port", httpPort);
    this.services = {};
    var baseGetDescription = this.GetDescription;

    this.GetDescription = ()=>{
        var descr = baseGetDescription.apply(this, arguments);
        descr.httpPort = httpPort;
        return descr;
    }

    this.Connect = (alias, url) => {
        Frame.log("Connecting url " + url);
        if (this.services[alias]){
          return this.services[alias];
        } else {
          this.services[alias] = {url: url};
          return ServiceProxy.Connect(url).then((service)=>{
            this.services[alias] = service;
            this.addServiceHandler("/" + alias);
          }).catch((error)=>{
            Frame.error(error);
          });
        }
    }

    this.router = new HttpRouter(httpPort, 15000);
    //this.router.debugMode = "trace";
    this.router.on("/<", (context) => {
        const url = context.query["url"];
        const alias = context.nodeName;
        if (url && alias){
          Frame.log("Connecting " + alias + " on url " + url);
          if (this.services[alias]){
            context.finish(this.services[alias]);
            return true;
          } else {
            this.services[alias] = {url: url};
            ServiceProxy.connect(url).then((service)=>{
              this.services[alias] = service;
              Frame.log("Connected " + alias + " on " + url);
              this.addServiceHandler(alias);
              context.finish(this.services[alias]);
            }).catch((error)=>{
              context.error(error.message, 500);
            });
            return false;
          }
          context.finish("No url or alias");
          return true;
        }
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
    console.log("ilab proxy on " + this.router.port);


    process.once('exiting', () => {
        self.router.close();
    });
    process.once('exit', () => {
        self.router.close();
    });
    return result;
};

ILabHttpProxy.serviceId = ("ILabHttpProxy");

Inherit(ILabHttpProxy, Service, {

    addServiceHandler : function (name) {
      const self = this;
        function callMethod(context) {
            console.log(name + "." + context.nodeName + " method calling ");
            const proxy = self.services[name];
            var method = proxy[context.nodeName];
            if (method) {
                var args = context.tail.split("/");
                args.shift();
                for (var i = 0; i < args.length; i++){
                    args[i] = JSON.parse(decodeURIComponent(args[i]));
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
                    self.emit('error', err);
                    context.error(err);
                })
            }
            else {
                context.error("Method " + context.current + context.tail + " not applying to service " + name);
            }
        }

        function callStartMethod(context) {
            const proxy = self.services[name];
            console.log(name + " StartService - ", context.nodeName);
            return proxy.StartService({id : context.nodeName}).then(function (result) {
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
                self.emit('error', err);
                context.error(err);
            });
        }

        function callResetOrStopMethod(context, method) {
            const proxy = self.services[name];
            console.log(name + " " + method + " - ", context.nodeName);
            return proxy[method](context.nodeName).then(function (result) {
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
                self.emit('error', err);
                context.error(err);
            });
        }
        this.router.on("/" + name, (httpContext) => {
            httpContext.res.setHeader("Content-Type", "text/json");
            return this.services[name];
        });
        this.router.on("/" + name + "/<", (context) => {
            context.res.setHeader("Content-Type", "text/json; charset=utf8");
            callMethod(context);
            return false;
        });
        this.router.on("/" + name + "/start/>", (context) => {
            context.res.setHeader("Content-Type", "text/json; charset=utf8");
            callStartMethod(context);
            return false;
        });
        this.router.on("/" + name + "/stop/>", (context) => {
            context.res.setHeader("Content-Type", "text/json; charset=utf8");
            callResetOrStopMethod(context, "StopService");
            return false;
        });
        this.router.on("/" + name + "/reset/>", (context) => {
            context.res.setHeader("Content-Type", "text/json; charset=utf8");
            callResetOrStopMethod(context, "ResetService");
            return false;
        });
    },


    removeServiceHandler : function (name, port) {
        //this.router.un();
    }
});

module.exports = ILabHttpProxy;
