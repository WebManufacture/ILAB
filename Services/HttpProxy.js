var fs = require('fs');
var http = require('http');
var Url = require('url');
var stream = require('stream');
var EventEmitter = require('events');
var Service = useSystem("Service.js");

HttpProxyService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    var port = 5100;
    if (params && params.port) port = params.port;
    this.headers = params.headers ? params.headers: {};
    this.allowOrigin = params.allowOrigin ? params.allowOrigin : "*";
    this.allowMethods = params.allowMethods ? params.allowMethods: "all";
    this.allowPreflight = params.allowPreflight ? params.allowPreflight : true;
    if (!this.server){
        this.server =  http.createServer(this.process.bind(this));
    }
    this.port = port;
    this.server.listen(this.port);
    this.container.on("/", (context) => {
        try {
            context.finish(self.services);
        } catch (err){
            Frame.error(err);
            this.emit('error', err);
            context.error(err);
        }
        return false;
    });
    console.log("HTTP PROXY ON " + this.port);
    process.once('exiting', () => {
        self.server.close();
    });
    process.once('exit', () => {
        self.server.close();
    });
    return result;
};

HttpProxyService.serviceId = ("HttpProxy");

Inherit(HttpProxyService, Service, {
    process : function(req, res) {
        var params = this.headers;
        if (params.headers && typeof params.headers == "object") {
            for (var key in params.headers){
                res.setHeader(key, params.headers[key]);
            }
        }
        if (this.allowOrigin) {
            res.setHeader("Access-Control-Allow-Origin", this.allowOrigin);
            if (this.allowMethods){
                if (this.allowMethods.toLowerCase() == "all") {
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
                else{
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
            }
            else{
                if (this.allowPreflight){
                    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                }
                else {
                    res.setHeader("Access-Control-Allow-Methods", "GET");
                }
            }
        }
        if (req.method == 'OPTIONS'){
            res.statusCode = 200;
            res.end("OK");
        }
        var self = this;
        try{
            self.processRequest(req, res);
        }
        catch (e){
            res.statusCode = 500;
            res.end(e.message);
        }
        return true;
    },

    processRequest : function (req, res) {
        var method = req.method;
        var data = "";
        req.on("data", (chunk)=>{
            if (chunk) {
                data += chunk;
            }
        });
        var id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");
        req.on("end", (chunk)=>{
            if (chunk) {
                data += chunk;
            }
            if (data){
                data = JSON.parse(data);
            }
            if (req.url == "/") {
                this.container.send(req.url + "/hi#" + id, data);
            }
            else {
                this.container.send(req.url + "/" + method.toLowerCase() + "#" + id, data);
            }
        });
    },


    removeServiceHandler : function (name, port) {
        //this.router.un();
    }
});

module.exports = HttpProxyService;
