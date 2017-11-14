var fs = useSystem('fs');
var Async = useModule('async');
var Path = useSystem('path');
var Url = useSystem('url');
var http = useSystem('http');
var https = useSystem('https');
var stream = useSystem('stream');
var EventEmitter = useSystem('events');
var Service = useRoot("/System/Service.js");
var ServiceProxy = useRoot("/System/Service.js");


StaticContentService = function(params){
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

    if (!params.filesServiceId) params.filesServiceId = "FilesService";

    if (params.mime){
        this.mime = params.mime;
    }
    else{
        this.mime = StaticContentService.MimeTypes;
    }

    this.config = params;

    this.connect(params.filesServiceId).then(function (proxy) {
        self.fs = proxy;
        self.enabled = true;
        console.log("connected to FS: " + params.filesServiceId);
    }).catch(function (err) {
        console.error("can't connect to FS service " + params.filesServiceId)
    });

    let createServer = http.createServer;
    if (params.useSecureProtocol){
        let options = {
            pfx: fs.readFileSync(Path.resolve(params.keyFile)),
            passphrase: fs.readFileSync(Path.resolve(params.certFile))
        };
        createServer = https.createServer.bind(options);
    }

    this.server = createServer((req, res) => {
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
        var context = null;
        try{
            if (self.enabled){
                self.process(req, res);
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
    });
    this.server.listen(port);
    console.log("Static service on " + port);
    return result;
};


StaticContentService.MimeTypes = {
    htm : "text/html; charset=utf-8",
    html : "text/html; charset=utf-8",
    js : "text/javascript; charset=utf-8",
    css : "text/css; charset=utf-8",
    json : "text/json; charset=utf-8",
    png : "image/png",
    gif : "image/gif",
    jpg : "image/jpeg",
    bmp : "image/bmp",
    ttf : "font/truetype; charset=utf-8"
};

Inherit(StaticContentService, Service, {
    formatPath : function (path) {
        return path;
    },

    process: function (req, res) {
        var serv = this;
        var url = Url.parse(req.url);
        var ptail = url.pathname;
        if (this.config.defaultFile && (ptail == "" || ptail == "/")){
            ptail += serv.config.DefaultFile;
        }
        var fpath = this.formatPath(ptail);
        if (req.method == "GET"){
            this.fs.Stats(fpath).then(
                function (stats, err){
                    if (stats.isDirectory){
                        if (url.query && url.query["join"]){
                            serv.ConcatDir(req, res, fpath, url.query);
                        }
                        else {
                            if (serv.config.allowBrowse){
                                serv.fs.Browse(fpath).then(function (dir) {
                                    res.setHeader("Content-Type", "application/json");
                                    res.statusCode = 200;
                                    res.end(JSON.stringify(dir));
                                }).catch(function (err) {
                                    res.statusCode = 500;
                                    res.end(err.message);
                                })
                            }
                            else{
                                res.statusCode = 403;
                                res.end("Directory listening not allowed");
                            }
                        }
                    }
                    else{
                        var ext = Path.extname(fpath);
                        ext = ext.replace(".", "");
                        ext = serv.mime[ext];
                        if (ext){
                            res.setHeader("Content-Type", ext);
                        }
                        else{
                            res.setHeader("Content-Type", "text/plain");
                        }
                        var enc = 'binary';
                        if (ext.indexOf("text/") >= 0) {
                            enc = 'utf-8';
                        }
                        serv.fs.ReadStream(fpath, enc).then(function (stream) {
                            stream.pipe(res);
                        }).catch(function (err) {
                            res.statusCode = 500;
                            res.end(err.message);
                        });
                    }
                }
            ).catch(function(err) {
                res.statusCode = 500;
                res.end(err.message);
            });
        }
    },

    ConcatDir : function(req, res, fpath, query){
        if (query["content-type"]){
            res.setHeader("Content-Type", query["content-type"] + "");
        }
        var self = this;
        this.fs.Browse(fpath).then(function(err, files){
            try{
                var collector = new Async.Collector(files.length);
                for (var i = 0; i < files.length; i++){
                    var fname = fpath + "\\" + files[i];
                    //console.log('concat ' + fname);
                    collector.createParametrizedCallback(fname, function(file, callback){
                        self.fs.Stats(file).then(function(stat){
                            var ext = Path.extname(file);
                            ext = ext.replace(".", "");
                            ext = serv.mime[ext];
                            if (stat.isFile()){
                                serv.fs.Read(file, 'utf-8').then(function(result){
                                    callback(result);
                                });
                            }
                            else{
                                callback("");
                            }
                        });
                    });
                }/*
                 collector.on('handler', function(param, count){
                 console.log('Handler complete ' + this.count + " " + count);
                 });*/
                collector.on('done', function(results){
                    var result = "";
                    if (query.first){
                        result += query.first;
                    }
                    for (var i = 0; i < results.length; i++){
                        if (results[i] && results[i] != ""){
                            result += results[i];
                            if (query.delimeter && i < results.length - 1){
                                result += query.delimeter;
                            }
                        }
                    };
                    if (query.last){
                        result += query.last;
                    }
                    res.statusCode = 200;
                    res.end(result);
                });
                collector.run();
            }
            catch(error){
                res.statusCode = 500;
                res.end(error);
                return;
            }
        }).catch(function (err) {
            res.statusCode = 500;
            res.end("readdir " + fpath + " error " + err);
        });
    },
});

module.exports = StaticContentService;