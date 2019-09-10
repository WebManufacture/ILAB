var fs = require('fs');
var Async = useModule('async');
var Path = require('path');
var Url = require('url');
var http = require('http');
var https = require('https');
var Service = useSystem("Service.js");
var httpProxy = require('http-proxy');

HttpProxyService = function(params){
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


    console.log("HttpProxy service on " + port);

    this.hosts = {
        ...params.hosts
    };

    this.StartEndpoint = (host, path) => {
        return this.hosts[host] = path;
    };

    this.Endpoints = () => {
        return this.hosts;
    };

    this.StopEndpoint = (host) => {
        return this.hosts[host] = null;
    };

    this.Enable = () => {
        this.enabled = true;
    };

    this.Disable = () => {
        this.enabled = false;
    };

    return result;
};

Inherit(HttpProxyService, Service, {
    process : function(req, res) {
        var params = this.config;
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
        if (req.method === 'OPTIONS'){
            res.statusCode = 200;
            res.end("OK");
        }
        var self = this;
        try{
            if (self.enabled){
                console.log(req.url);
                var url = Url.parse(req.url);
                if (self.hosts[url.hostname]){
                    proxy.web(req, res, {target: self.hosts[url.hostname]});
                }
                if (self.hosts['*']) {
                    proxy.web(req, res, {target: self.hosts['*']});
                    return;
                }
                res.statusCode = 404;
                res.end("Proxy config not found for the path" + req.url);
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

module.exports = HttpProxyService;
