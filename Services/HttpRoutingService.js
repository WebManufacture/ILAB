var fs = require('fs');
var Async = useModule('async');
var Path = require('path');
var Url = require('url');
var http = require('http');
var https = require('https');
var Service = useSystem("Service.js");
var HttpRouter = useModule('HttpRouter');

HttpRoutingService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;

    this.aliases = {};
    if (params.aliases && typeof params.aliases == "object"){
        this.aliases = params.aliases;
    }
    this.enabled = false;
    var port = 80;
    if (params && params.port && params.port != "default") port = parseInt(params.port);
    if (isNaN(port)) port = 1500;

    this.config = params;


    if (params.useSecureProtocol == 'pfx'){
        let options = {
            pfx: fs.readFileSync(Path.resolve(params.keyFile)),
            passphrase: params.pass
        };
        this.server =  https.createServer(options, this.process.bind(this));
    }
    if (params.useSecureProtocol == 'pem'){
        let options = {
            key: fs.readFileSync(Path.resolve(params.keyFile), 'utf8'),
            cert: fs.readFileSync(Path.resolve(params.certFile), 'utf8')
        };
        this.server =  https.createServer(options, this.process.bind(this));
    }
    if (!this.server){
        this.server =  http.createServer(this.process.bind(this));
    }
    this.server.listen(port);
    console.log("Static service on " + port);

    this.hosts = {
        ...params.hosts
    };

    this.StartEndpoint = function (host, path) {
        return null;
    };

    this.Endpoints = function () {
        return this.hosts;
    };

    this.StopEndpoint = function (host) {
        return null;
    };

    this.RoutePath = function (path) {

    };

    this.UnroutePath = function (path) {

    };

    return result;
};

Inherit(HttpRoutingService, Service, {
    formatPath : function (path) {
        if (this.config.defaultFile && (ptail == "" || ptail == "/")){
            ptail += serv.config.defaultFile;
        }
        return path;
    },

    process : function(req, res) {
        var params = this.headers;
        if (params.headers && typeof params.headers == "object") {
            for (var key in params.headers){
                res.setHeader(key, params.headers[key]);
            }
        }
        if (params.allowOrigin) {
            res.setHeader("Access-Control-Allow-Origin", params.allowOrigin);
            if (params.allowMethods){
                if (params.allowMethods.toLowerCase() == "all") {
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
                else{
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
            }
            else{
                if (params.allowPreflight){
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
            if (self.enabled){



                //self.process(req, res);
            }
            else{
                res.statusCode = 403;
                res.end("Server disabled");
            }
        }
        catch (e){
            res.statusCode = 500;
            res.end(e.message);
        }
        return true;
    }
});

module.exports = HttpRoutingService;
