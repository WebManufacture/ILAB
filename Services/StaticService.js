var fs = require('fs');
var Path = require('path');
var Url = require('url');
var http = require('http');
var https = require('https');
var stream = require('stream');
var utils = useModule('utils');
var Async = useModule('async');
var EventEmitter = require('events');
var Service = useSystem("Service.js");
var ServiceProxy = useSystem("ServiceProxy.js");


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
    } else {
        this.mime = StaticContentService.MimeTypes;
    }

    this.config = params;

    this.connect(params.filesServiceId).then(function (proxy) {
        self.fs = proxy;
        self.enabled = true;
        console.log("connected to FS: " + params.filesServiceId);
        if (params.template) {
            console.log("Reading template: " + params.template);
            proxy.Read(params.template).then((template) => {
                console.log("Template set: " + params.template);
                self.template = template;
            });
        }
    }).catch(function (err) {
        console.error(err);
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

    this.cache = {};
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
    formatPath: function (path, method) {
        if (this.config.rootFile && path == "/" && method == "GET") {
            return this.config.rootFile;
        }
        if (this.config.settingsRequest && path == "/" + this.config.settingsRequest && method == "GET") {
            return '/settings';
        }
        return this.config.basepath ? this.config.basepath + path : path;
    },

    process: function (req, res) {
        var serv = self = this;
        var url = Url.parse(req.url, true);
        var ptail = url.pathname;
        var fpath = self.formatPath(ptail, req.method);
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
                } else {
                    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, PUT, POST, HEAD, OPTIONS, SEARCH");
                }
            } else {
                if (params.allowPreflight) {
                    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                } else {
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
            if (serv.enabled) {
                if (req.method == "GET" || req.method == "SEARCH") {
                    if (fpath == "/settings") {
                        if (serv.config.allowSettings) {
                            var settings = {};
                            return Promise.all([
                                ServicesManager.GetService("ServicesWebSocketProxy").then((proxy) => {
                                    settings.ServicesWebSocketProxy = proxy;
                                }),
                                ServicesManager.GetService("ServicesHttpProxy").then((proxy) => {
                                    settings.ServicesHttpProxy = proxy;
                                }),
                                ServicesManager.GetService("StaticService").then((proxy) => {
                                    settings.StaticService = proxy;
                                }),
                                ServicesManager.GetServices().then((proxy) => {
                                    settings.OtherServices = proxy;
                                })
                            ]).then(() => {
                                res.setHeader("Content-Type", "application/json");
                                res.statusCode = 200;
                                res.end("window.LocalIlabSettings = " + JSON.stringify(settings));
                            }).catch((err) => {
                                res.statusCode = 500;
                                Frame.error(err);
                                res.end(JSON.stringify(err));
                            });
                        } else {
                            return false;
                            res.statusCode = 403;
                            res.end("Not allowed by config");
                        }
                    }
                    ;
                    if (req.method == "GET" && serv.config.allowCache) {
                        var result = serv.ProcessCache(req, res, fpath, url.query);
                        if (result > 0) {
                            res.statusCode = result;
                            res.end();
                            return;
                        }
                    }
                    return self.fs.Stats(fpath).then(
                        (stats, err) => {
                            try {
                                if (stats.isDirectory) {
                                    if (url.query && url.query["join"]) {
                                        serv.ConcatDir(req, res, fpath, url.query);
                                    } else {
                                        if (req.method == "GET" && serv.template) {
                                            res.setHeader("Content-Type", "application/html");
                                            serv.ApplyTemplate(req, res, fpath, url.query, serv.template);
                                        } else {
                                            if (req.method == "SEARCH" || serv.config.allowBrowse) {
                                                serv.fs.Browse(fpath).then(function (dir) {
                                                    res.setHeader("Content-Type", "application/json");
                                                    res.statusCode = 200;
                                                    res.end(JSON.stringify(dir));
                                                }).catch(function (err) {
                                                    console.log("Reading dir error " + err);
                                                    res.statusCode = 500;
                                                    res.end(err.message);
                                                })
                                            } else {
                                                console.log("NOT ALLOWED ");
                                                res.statusCode = 403;
                                                res.end("Directory listening not allowed");
                                            }
                                        }
                                    }
                                } else {
                                    var ext = Path.extname(fpath);
                                    ext = ext.replace(".", "");
                                    ext = serv.mime[ext];
                                    var encoding = null;
                                    /*if (ext && ext.indexOf("text/") >= 0) {
                                     encoding = 'utf8';
                                     }*/
                                    serv.fs.ReadStream(fpath, encoding).then((stream) => {
                                        //stream.setEncoding('bi');
                                        res.setHeader("request-id", stream.id);
                                        if (ext) {
                                            res.setHeader("Content-Type", ext);
                                        } else {
                                            res.setHeader("Content-Type", "text/plain; charset=utf-8");
                                        }
                                        //res.outputEncodings.push("binary");
                                        res.setHeader("Content-Length", stream.length);
                                        const useStreams = true;
                                        if (useStreams) {
                                            stream.pipe(res);
                                        } else {
                                            var actualLength = 0;
                                            stream.on('data', (data) => {
                                                data = Buffer.from(data, 'binary');
                                                res.write(data);
                                                actualLength += data.length;
                                            });
                                            stream.on('end', (chunk) => {
                                                if (chunk) {
                                                    actualLength += chunk.length;
                                                }
                                                //console.log("actual length " + actualLength);
                                                res.end(chunk);
                                            });
                                        }
                                    }).catch(function (err) {
                                        res.setHeader("Content-Type", "text/plain; charset=utf-8");
                                        res.statusCode = 500;
                                        res.end(err.message);
                                        console.error(err);
                                    });
                                }
                            } catch (err) {
                                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                                res.statusCode = 500;
                                res.end(err.message);
                                console.log(err);
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
                if ((req.method == "POST" || req.method == "PATCH" || req.method == "PUT") && self.config.allowSave) {
                    var ext = Path.extname(fpath);
                    ext = ext.replace(".", "");
                    ext = serv.mime[ext];
                    if (ext) {
                        res.setHeader("Content-Type", ext);
                    } else {
                        res.setHeader("Content-Type", "text/plain; charset=utf-8");
                    }
                    var encoding = null;
                    if (ext.indexOf("text/") >= 0) {
                        encoding = 'utf8';
                    }
                    return serv.fs.WriteStream(fpath, encoding).then(function (stream) {
                        req.on("data", (chunk) => {
                            stream.write(chunk, encoding);
                        });
                        req.on("end", (chunk) => {
                            stream.end(chunk);
                            res.statusCode = 200;
                            res.end("OK");
                        });
                    }).catch(function (err) {
                        res.statusCode = 500;
                        res.end(err.message);
                    });
                }
                res.statusCode = 403;
                res.end("Unknown method " + req.method);
            } else {
                res.statusCode = 403;
                res.end("Server disabled");
            }
        } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
        }
    },

    ConcatDir: function (req, res, fpath, query) {
        if (query["content-type"]) {
            res.setHeader("Content-Type", query["content-type"] + "");
        }
        var self = this;
        this.fs.Browse(fpath).then(function (files) {
            try {
                var first = new Promise(function(resolve, reject){
                    if (query.first) {
                        resolve(query.first);
                    } else {
                        resolve("");
                    }
                });
                files.forEach((fileInfo) => {
                    const file = fpath + "\\" + fileInfo.name;
                    var ext = Path.extname(file);
                    ext = ext.replace(".", "");
                    ext = self.mime[ext];
                    if (fileInfo.fileType == "file") {
                        first = first.then((result1) => {
                            return self.fs.Read(file, 'utf-8').then((result)=>{
                                return (result1 ? result1 : "") + (query.delimeter && result1 ? query.delimeter : "") + result;
                            });
                        });
                    }
                });
                first.then((result)=>{
                    if (query.last) {
                        result += query.last;
                    }
                    res.statusCode = 200;
                    res.end(result);
                });
            } catch (error) {
                res.statusCode = 500;
                res.end(error.message);
                console.error(error);
                return;
            }
        }).catch(function (err) {
            res.statusCode = 500;
            res.end("readdir " + fpath + " error " + err);
            console.error(err);
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
                                } else {
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
                } catch (error) {
                    reject(error);
                }
            }).catch(function (err) {
                reject(err);
            });
        });
        return promise;
    },

    ApplyTemplate: function (req, res, fpath, query, template) {
        var params = {
            content: template,
            url: query,
            statusCode: 200,
            req: req,
            res: res,
            fpath: fpath
        };
        var regex = /<:(\w+)([^>]*)>?(.*)<\/:\1>/ig;
        var match;
        var processed = true;
        var fb = new Async.Collector(false, function (results) {
            var resNum = 0;
            var content = template.replace(regex, function (src) {
                if (results[resNum]) return results[resNum++];
                return "";
            });
            res.statusCode = 200;
            res.end(content);
        });
        while ((match = regex.exec(template)) !== null) {
            var pname = match[1];
            var pconf = match[2];
            var pval = match[3];
            var cp = this.ContentProcessors[pname];
            if (cp) {
                processed = false;
                fb.addClosureCallback(cp, this, [params, pval, pconf]);
            }
        }
        if (!processed) fb.run();
        return processed;
    },

    ContentProcessors: {
        file: function (params, value, pconf, callback) {
            var fpath = params.fpath + "\\" + value;
            console.log("Templating file: " + fpath);
            this.fs.Read(fpath).then((result) => {
                callback(result);
            }).catch((err)=>{
                callback(err);
            });
        },

        http: function (params, value, pconf, callback) {
            var fpath = this.formatPath(value);
            var lf = this.cache[fpath];
            if (lf) {
                callback(lf);
            } else {
                console.log("Getting " + fpath);
                callback("");
            }
        },

        path: function (params, value, pconf, callback) {
            var fpath = this.formatPath(value);
            console.log("Templating " + fpath);
            this.fs.Read(fpath).then((result) => {
                callback(result);
            }).catch((err)=>{
                callback(err);
            });
        },

        eval: function (params, value, pconf, callback) {
            try {
                var result = EvalInContext(value, this, params);
            } catch (error) {
                callback(error + "");
                return;
            }
            callback(result);
        }
    },

    ProcessCache: function (req, res, fpath, query) {
        var serv = this;
        if (query["content-type"]) {
            res.setHeader("Content-Type", query["content-type"] + "");
        } else {
            //res.setHeader("Content-Type", "text/plain; charset=utf-8");
        }
        var dnow = new Date();
        res.setHeader("Cache-Control", "max-age=3600");
        res.setHeader("Expires", new Date(dnow.valueOf() + 1000 * 3600).toString());
        var inm = req.headers["if-none-match"];
        //console.log(inm + " " + serv.cache[fpath] + " " + fpath);
        var etag = serv.cache[fpath];
        if (!etag) {
            etag = (Math.random() + "").replace("0.", "");
            //console.log(etag + " " + fpath);
            serv.cache[fpath] = etag;
        }
        res.setHeader("ETag", etag);
        if (etag == inm) {
            if (serv.cache[fpath]) {
                res.setHeader("Content-Type", serv.cache[fpath]);
            }
            return 304;
        }
        return 0;
    }
});

module.exports = StaticContentService;
