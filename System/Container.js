var Path = require('path');
var os = require('os');
var EventEmitter = require('events');
require(Path.resolve('System/RequireExtention.js'));
var XRouter = useSystem("XRouter");

process.on('uncaughtException', function (ex) {
    console.error(ex);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

function parseConfig(config){
    if (!config) return null;
    if (!config.type){
        config.type = "node";
    }
    if (config.id) {
        if (config.id == "auto") {
            config.id = createUUID();
        }
    } else {
        config.id = config.type;
    }
    if (!config.path){
        config.path = config.type;
    }
    if (config.path.indexOf(".js") < 0) {
        config.path += ".js";
    }
    return config;
}

function Container(config) {
    this.services = [];
    this.isChild = config && config.isChild != undefined ? config.isChild : process.isChild;
    if (!this.id) this.id = config && config.id ? config.id : createUUID();
    if (!this.localId) {
        this.localId = config && config.localId ? config.localId : (this.id ? this.id : this.newId() + "").substring(30, 36)
    }
    if (!this.type) this.type = config && config.type ? config.type : "container";
    if (!this.tags) this.tags = config && config.tags ? config.tags : [];

    this.selector = this.type + "#" + this.id;
    for (var tag of this.tags){
        this.selector += "." + tag;
    }

    process.container = this;
    process.setMaxListeners(100);

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


    var startPromises = [];
    if (config.terminals.length) {
        this.debug("Detected " + config.terminals.length + " terminals");
        for (var i = 0; i < config.terminals.length; i++) {
            ((params) => {
                var params = parseConfig(params);
                var path = params.path;
                if (path) {
                    if (path.indexOf(".js") != path.length - 3) {
                        path += ".js";
                    }
                    if (path.indexOf("/") < 0 && path.indexOf("\\") < 0) {
                        path = "Terminals/" + path;
                    }
                }
                var terminal = this.startModule(Path.resolve(path), params);
                if (terminal && terminal instanceof Promise) {
                    startPromises.push(terminal);
                }
            })(config.terminals[i]);
        }
    }
    Promise.all(startPromises).then(() => {
        this.emit("termianals-started");
        console.log("All terminals started!");

        if (config.nodes.length) {
            this.debug("Detected " + config.nodes.length + " nodes to start");
            var startPromises = [];
            for (var i = 0; i < config.nodes.length; i++) {
                ((params) => {
                    var path = params.path;
                    if (path) {
                        path = Path.resolve(path);
                        var node = this.start(path, serviceParams);
                    }
                    if (node && node instanceof Promise) {
                        startPromises.push(new Promise(node));
                    }
                    if (node && node instanceof EventEmitter) {
                        startPromises.push(new Promise((resolve, reject) => {
                            node.once("started", () => {
                                self.log("Started: " + path);
                                resolve();
                            });
                        }));
                    }
                })(config.nodes[i]);
            }
            Promise.all(startPromises).then(() => {
                this.emit("nodes-started");
                console.log("All nodes started!");
            });
        }
    });

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

    startNode: function (node, params) {
        if (node && typeof node == "function") {
            try {
                if (node.prototype) {
                    node = new node(params, this);
                } else {
                    node = node(params);

                }
                if (node) {
                    this.registerNode(node);
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

    startModule: function (path, params) {
        var node = require(path);
        return node.call(this, params);
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
                                this.startNode(rawData);
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
                        return this.startNode(node, params);
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
    },

    //Old - style service description
    getDescription(){
        var obj = { id : this.id };
        for (var item in this){
            if (item.indexOf("_") != 0 && typeof (this[item]) == "function" && this.hasOwnProperty(item)){
                obj[item] = "method";
            }
        }
        return obj;
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
