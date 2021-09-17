var fs = require('fs');
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
    this.enabled = true;
    if (params.enabled !== undefined){
        this.enabled = params.enabled;
    }
    var httpPort = 80;
    if (params && params.httpPort && params.httpPort != "default") httpPort = parseInt(params.httpPort);
    if (isNaN(httpPort)) httpPort = 1500;
    this.httpPort = httpPort;
    this.config = params;
    this.protocol = "http://";

    var baseGetDescription = this.GetDescription;

    this.GetDescription = ()=>{
        var descr = baseGetDescription.apply(this, arguments);
        descr.httpPort = httpPort;
        descr.protocol = this.protocol;
        descr.hosts = this.hosts;
        return descr;
    };

    if (params.useSecureProtocol == 'pfx'){
        this.protocol = "https://";
        let options = {
            pfx: fs.readFileSync(Path.resolve(params.keyFile)),
            passphrase: params.pass
        };
        this.server =  https.createServer(options, this.process.bind(this));
    }
    if (params.useSecureProtocol == 'pem'){
        this.protocol = "https://";
        let options = {
            key: fs.readFileSync(Path.resolve(params.keyFile), 'utf8'),
            cert: fs.readFileSync(Path.resolve(params.certFile), 'utf8')
        };
        this.server =  https.createServer(options, this.process.bind(this));
    }
    if (!this.server){
        this.server =  http.createServer(this.process.bind(this));
    }
    this.server.listen(httpPort);
    this.proxy = httpProxy.createProxyServer({});
    this.proxy.on('error', (err,req,res) => {
        var url = Url.parse(this.protocol + req.headers.host + req.url, true);
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
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        console.error("Proxy Error " + req.method.toUpperCase() + ":" + url.href);
        console.error(err);
        res.end(err.message);
    });
    console.log("HttpProxy service on " + httpPort);

    this.hosts = {
        ...params.hosts
    };

    for (let item in this.hosts){
        console.log("Proxying " + item + ":" + httpPort + "  -->  " + this.hosts[item]);
    }

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
                var url = Url.parse(self.protocol + req.headers.host + req.url, true);
                var redirect = null;
                if (self.hosts[url.hostname]){
                    redirect = self.hosts[url.hostname];
                    redirect = redirect.indexOf("://") >= 0 ? redirect : self.protocol + redirect;
                }
                if (!redirect && self.hosts['*']) {
                   // console.log("Proxying " + req.method.toUpperCase() + ":" + url.href +  "  -->  " + self.hosts["*"]);
                    redirect = self.hosts['*'];
                    redirect = redirect.indexOf("://") >= 0 ? redirect : self.protocol + redirect;
                }
                if (redirect){
                    console.log("Proxying " + req.method.toUpperCase() + ":" + url.href + "  -->  " + redirect);
                    self.proxy.web(req, res, {
                        target: redirect,
                        ws: true
                    });
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
