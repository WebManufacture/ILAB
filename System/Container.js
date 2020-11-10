var Path = require('path');
var os = require('os');
require(Path.resolve('System/RequireExtention.js'));
var XRouter = useSystem("XRouter");

process.on('uncaughtException', function (ex) {
    console.error(ex);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

function Container(config) {
    this.services = [];
    this.isChild = config && config.isChild != undefined ? config.isChild : process.connected;
    if (!this.id) this.id = config && config.id ? config.id : this.newId();
    if (!this.localId) {
        this.localId = config && config.localId ? config.localId : (this.id ? this.id : this.newId() + "").substring(30, 36)
    }
    if (!this.type) this.type = config && config.type ? config.type : "container";
    if (!this.tags) this.tags = config && config.tags ? config.tags : [];

    XRouter.apply(this, arguments);

    var self = this;

    var oldLog = console.log;
    console.log = function () {
        var log = arguments[0];
        if (typeof log == "string" && log.indexOf(self.id) < 0) {
            arguments[0] = (self.type ? self.type : "") + (self.id ? "#" + (self.localId ? self.localId : self.id) : "") + ": " + log;
        }
        oldLog.apply(this, arguments);
    };

    this.infoDescriptor = {};

    this.follow(this.type + "#" + this.id, "self");
    this.follow("#" + this.id, "self");
    this.follow(this.type + "#" + this.localId, "self");
    this.follow("#" + this.localId, "self");
    this.follow(this.type, "self");

    //Starting services by config

    var servicesToStart = [];

    if (config && config.services){
        servicesToStart = [...config.services];
    }

    if (servicesToStart.length) {
        this.debug("Detected " + servicesToStart.length + " services to start")
        var startPromises = [];
        for (var i = 0; i < servicesToStart.length; i++) {
            ((serviceParams) => {
                var servicePath = serviceParams.path;
                if (servicePath) {
                    if (servicePath.indexOf("http://") != 0 && servicePath.indexOf("https://") != 0) {
                        if (servicePath.indexOf(".js") != servicePath.length - 3) {
                            servicePath += ".js";
                        }
                        if (servicePath.indexOf("/") < 0 && servicePath.indexOf("\\") < 0) {
                            servicePath = Path.resolve(process.ServicesPath + servicePath);
                        } else {
                            servicePath = Path.resolve(servicePath);
                        }
                    }
                }
                var service = this.start(servicePath, serviceParams);
                if (service) {
                    startPromises.push(new Promise((resolve, reject) => {
                        service.once("started", () => {
                            self.log("Started: " + servicePath);
                            resolve();
                        });
                    }));
                }
            })(servicesToStart[i]);
        }
        Promise.all(startPromises).then(() => {
            this.emit("services-started");
            console.log("All started!");
        });
    }
}

Inherit(Container, XRouter, {
    newId: function () {
        return require('uuid/v4')();
    },

    redirect: function(from, to){
        this.on(from, (message, selector, route) => {
            message.from = message.from.toString().replace(to.toString(), "");
            message.to = to;
            this.route(message);
        });
    },

    follow: function(from, to){
        this.on(from, (message) => {
            this.route(message, to);
        });
    },

    getPipe: function () {
        return os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + this.localId : '/tmp/ilab-3-' + this.localId;
    },

    onSelf: function(selector, handler){
        return this.on("/self" + (selector.indexOf('/') == 0 ? selector : "/" + selector), handler);
    },

    registerService(service) {
        /* на случай если в контракте понадобятся методы класса сервиса, а не только его экземпляра
         service = service.__proto__;
         for (var item in service){
         if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
         obj[item] = "method";
         }
         }
         */
        service.init(this.infoDescriptor);
    },

    execCode: function (code, params) {
        this.log("Virtual code starting...");
        code = vm.Script(code, {filename: params.nodePath || params.path || "tempNode.vm"});
        code = code.runInThisContext();
        this.log("Virtual code started");
        return code;
    },

    startService: function (node, params) {
        if (node && typeof node == "function") {
            try {
                if (node.prototype) {
                    node = new node(params, this);
                } else {
                    node = node(params);

                }
                if (node) {
                    this.registerService(node);
                }
                var message = {
                    type: "control",
                    state: "started",
                    config: params
                };
                if (typeof node != "object" && typeof node != "function") message.result = node;
                this.send(XRouter.TYPE_EVENT, message);
                return node;

            } catch (err) {
                this.error(err);
            }
        } else {
            this.log("unresolved start service: " + node);
        }
    },

    start: function (path, params) {
        try {
            if (!params) params = {};
            if (typeof path == "string") {
                if (path.indexOf("http://") == 0 || path.indexOf("https://") == 0) {
                    http.get(path, (res) => {
                        var statusCode = res.statusCode;
                        if (statusCode !== 200) {
                            this.fatal("Can't get node: " + res.statusCode + " : " + path);
                            return;
                        }
                        res.setEncoding('utf8');
                        var rawData = '';
                        res.on('data', (chunk) => rawData += chunk);
                        res.on('end', () => {
                            try {
                                /*
                                    process.nodePath = process.serviceId ? process.serviceId : "UnknownTempService" + Math.random() + ".js";
                                    process.nodePath = process.nodePath.replace(/\//ig, '-');
                                    process.nodePath = process.nodePath.replace(/\\/ig, '-');
                                    if (process.nodePath.indexOf(".js") != process.nodePath.length - 3) {
                                        process.nodePath += ".js";
                                    }
                                    const tempPath = Path.resolve("./Temp/");
                                    if (!fs.existsSync(tempPath)){
                                        fs.mkdirSync(tempPath);
                                    }
                                    process.nodePath =  Path.resolve("./Temp/" + process.nodePath);
                                    fs.writeFile(process.nodePath, rawData, function (err, result) {
                                        if (err){
                                            process.fatal(err);
                                            return;
                                        }
                                        process._initFrame();
                                    });
                                    */
                                this.startService(rawData);
                            } catch (e) {
                                this.error(e);
                            }
                        });
                    }).on('error', (e) => {
                        this.error(e);
                    });
                } else {
                    var node = require(path);
                    if (typeof node == "string") {
                        return this.execCode(node, params);
                    } else {
                        return this.startService(node, params);
                    }
                }
            }
        } catch (err) {
            this.error(err);
        }
    },


    fatal: function (err) {
        if (typeof (err) == "object") {
            this.send(XRouter.TYPE_FATAL, {message: err.message, item: err.stack});
        } else {
            this.send(XRouter.TYPE_FATAL, {message: err, item: null});
        }
        console.error(err);
        setImmediate(function () {
            process.exit();
        });
    },

    debug: function (log) {
        this.send(XRouter.TYPE_TRACE, {item: log});
        console.log(log);
    },

    log: function (log) {
        this.send(XRouter.TYPE_INFO, {item: log});
        console.log(log);
    },

    error: function (err) {
        if (typeof (err) == "object") {
            this.send(XRouter.TYPE_ERROR, {message: err.message, item: err.stack});
        } else {
            this.send(XRouter.TYPE_ERROR, {message: err, item: null});
        }
        console.error(err);
    }
});

Container.Statuses = ["new", "killed", "exited", "paused", "reserved", "stopping", "error", "loaded", "started", "working"];
Container.STATUS_NEW = 0;
Container.STATUS_KILLED = 1;
Container.STATUS_EXITED = 2;
Container.STATUS_PAUSED = 3;
Container.STATUS_STOPPING = 5;
Container.STATUS_ERROR = 6;
Container.STATUS_LOADED = 7;
Container.STATUS_STARTED = 8;
Container.STATUS_WORKING = 9;

module.exports = Container;
