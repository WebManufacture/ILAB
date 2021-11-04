var fs = require('fs');
var Async = require('async');
var Path = require('path');
var Url = require('url');
var http = require('http');
var https = require('https');
var stream = require('stream');
var EventEmitter = require('events');
var Service = useSystem("Service.js");
var ServiceProxy = useSystem("Service.js");


StaticContentService = function (params) {
    var result = Service.apply(this, arguments);
    var self = this;
    this.aliases = {};
    this.params = params;
    if (params.aliases && typeof params.aliases == "object") {
        this.aliases = params.aliases;
    }
    this.enabled = false;
    var port = 80;
    if (params && params.port && params.port != "default") port = parseInt(params.port);
    if (isNaN(port)) port = 1500;

    if (!params.filesServiceId) params.filesServiceId = "FilesService";

    if (params.mime) {
        this.mime = params.mime;
    }
    else {
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

    let processFunc = (req, res) => {
        self.process(req, res);
        return true;
    };

    if (params.useSecureProtocol == 'pfx') {
        let options = {
            pfx: fs.readFileSync(Path.resolve(params.keyFile)),
            passphrase: params.pass
        };
        this.server = https.createServer(options, processFunc);
    }
    if (params.useSecureProtocol == 'pem') {
        let options = {
            key: fs.readFileSync(Path.resolve(params.keyFile), 'utf8'),
            cert: fs.readFileSync(Path.resolve(params.certFile), 'utf8')
        };
        this.server = https.createServer(options, processFunc);
    }
    if (!this.server) {
        this.server = http.createServer(processFunc);
    }
    this.server.listen(port);
    console.log("Static service on " + port);


    process.once('exiting', () => {
        self.server.close();
    });
    process.once('exit', () => {
        self.server.close();
    });

    this.Get = function (path) {
        return serv.fs.Read(this.formatPath(path));
    };

    this.Browse = function (path) {
        return serv.fs.Browse(this.formatPath(path));
    };

    this.Concat = function (path) {
        return this.concatDir(this.formatPath(path));
    };
};


StaticContentService.MimeTypes = {
    htm: "text/html; charset=utf-8",
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "text/json; charset=utf-8",
    png: "image/png",
    gif: "image/gif",
    jpg: "image/jpeg",
    bmp: "image/bmp",
    ttf: "font/truetype; charset=utf-8"
};

Inherit(StaticContentService, Service, {
    formatPath: function (path) {
        if (this.config.rootFile && path == "/") {
            path += this.config.rootFile;
        }
        return path;
    },

    process: function (req, res) {
        var serv = self = this;
        var url = Url.parse(req.url);
        var ptail = url.pathname;
        var fpath = this.formatPath(ptail);
        var params = self.params;
        if (params.headers && typeof params.headers == "object") {
            for (var key in params.headers) {
                res.setHeader(key, params.headers[key]);
            }
        }
        if (params.allowOrigin) {
            res.setHeader("Access-Control-Allow-Origin", params.allowOrigin);
            if (params.allowMethods) {
                if (params.allowMethods.toLowerCase() == "all") {
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
                else {
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
            }
            else {
                if (params.allowPreflight) {
                    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                }
                else {
                    res.setHeader("Access-Control-Allow-Methods", "GET");
                }
            }
        }

        if (req.method == 'OPTIONS') {
            res.statusCode = 200;
            res.end("OK");
        }
        var context = null;
        try {
            if (self.enabled) {
                if (req.method == "GET") {
                    return this.fs.Stats(fpath).then(
                        function (stats, err) {
                            if (stats.isDirectory) {
                                if (url.query && url.query["join"]) {
                                    serv.ConcatDir(req, res, fpath, url.query);
                                }
                                else {
                                    if (serv.config.allowBrowse) {
                                        serv.fs.Browse(fpath).then(function (dir) {
                                            res.setHeader("Content-Type", "application/json");
                                            res.statusCode = 200;
                                            res.end(JSON.stringify(dir));
                                        }).catch(function (err) {
                                            res.statusCode = 500;
                                            res.end(err.message);
                                        })
                                    }
                                    else {
                                        res.statusCode = 403;
                                        res.end("Directory listening not allowed");
                                    }
                                }
                            }
                            else {
                                var ext = Path.extname(fpath);
                                ext = ext.replace(".", "");
                                ext = serv.mime[ext];
                                if (ext) {
                                    res.setHeader("Content-Type", ext);
                                }
                                else {
                                    res.setHeader("Content-Type", "text/plain; charset=utf-8");
                                }
                                var encoding = 'binary';
                                if (ext.indexOf("text/") >= 0) {
                                    encoding = 'utf8';
                                }
                                serv.fs.ReadStream(fpath, encoding).then(function (stream) {
                                    res.setHeader("Content-Length", stream.length);
                                    stream.setEncoding(encoding);
                                    stream.pipe(res);
                                }).catch(function (err) {
                                    res.statusCode = 500;
                                    res.end(err.message);
                                });
                            }
                        }
                    ).catch(function (err) {
                        res.statusCode = 500;
                        if (err.message) {
                            res.end(err.message);
                        } else {
                            res.end(err);
                        }
                    });
                }
            }
            else {
                res.statusCode = 403;
                res.end("Server disabled");
            }
        }
        catch (e) {
            res.statusCode = 500;
            res.end(e.message);
        }
    },

    ConcatDir: function (req, res, fpath, query) {
        if (query["content-type"]) {
            res.setHeader("Content-Type", query["content-type"] + "");
        }
        var self = this;
        this.fs.Browse(fpath).then(function (err, files) {
            try {
                var collector = new Async.Collector(files.length);
                for (var i = 0; i < files.length; i++) {
                    var fname = fpath + "\\" + files[i];
                    //console.log('concat ' + fname);
                    collector.createParametrizedCallback(fname, function (file, callback) {
                        self.fs.Stats(file).then(function (stat) {
                            var ext = Path.extname(file);
                            ext = ext.replace(".", "");
                            ext = serv.mime[ext];
                            if (stat.isFile()) {
                                serv.fs.Read(file, 'utf-8').then(function (result) {
                                    callback(result);
                                });
                            }
                            else {
                                callback("");
                            }
                        });
                    });
                }
                /*
                                 collector.on('handler', function(param, count){
                                 console.log('Handler complete ' + this.count + " " + count);
                                 });*/
                collector.on('done', function (results) {
                    var result = "";
                    if (query.first) {
                        result += query.first;
                    }
                    for (var i = 0; i < results.length; i++) {
                        if (results[i] && results[i] != "") {
                            result += results[i];
                            if (query.delimeter && i < results.length - 1) {
                                result += query.delimeter;
                            }
                        }
                    }
                    ;
                    if (query.last) {
                        result += query.last;
                    }
                    res.statusCode = 200;
                    res.end(result);
                });
                collector.run();
            }
            catch (error) {
                res.statusCode = 500;
                res.end(error);
                return;
            }
        }).catch(function (err) {
            res.statusCode = 500;
            res.end("readdir " + fpath + " error " + err);
        });
    },

    concatDir: function (fpath, params) {
        var self = this;
        if (!params) params = {first: '', delimeter: ' ', last: ''};
        var promise = new Promise(function (resolve, reject) {
            this.fs.Browse(fpath).then(function (err, files) {
                try {
                    var collector = new Async.Collector(files.length);
                    for (var i = 0; i < files.length; i++) {
                        var fname = fpath + "\\" + files[i];
                        //console.log('concat ' + fname);
                        collector.createParametrizedCallback(fname, function (file, callback) {
                            self.fs.Stats(file).then(function (stat) {
                                var ext = Path.extname(file);
                                ext = ext.replace(".", "");
                                ext = serv.mime[ext];
                                if (stat.isFile()) {
                                    self.fs.Read(file, 'utf-8').then(function (result) {
                                        callback(result);
                                    });
                                }
                                else {
                                    callback("");
                                }
                            });
                        });
                    }
                    /*
                     collector.on('handler', function(param, count){
                     console.log('Handler complete ' + this.count + " " + count);
                     });*/
                    collector.on('done', function (results) {
                        var result = "";
                        if (params.first) {
                            result += params.first;
                        }
                        for (var i = 0; i < results.length; i++) {
                            if (results[i] && results[i] != "") {
                                result += results[i];
                                if (params.delimeter && i < results.length - 1) {
                                    result += params.delimeter;
                                }
                            }
                        }
                        ;
                        if (params.last) {
                            result += params.last;
                        }
                        resolve(result);
                    });
                    collector.run();
                }
                catch (error) {
                    reject(error);
                }
            }).catch(function (err) {
                reject(err);
            });
        });
        return promise;
    },
});

module.exports = StaticContentService;