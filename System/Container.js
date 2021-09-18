var Path = require('path');
var os = require('os');
var EventEmitter = require('events');
var XRouter = require(Path.resolve("./Utils/XRouter.js"));

function parsePath(config){
    if (!config) return null;
    if (!config.path){
        config.path = Path.resolve(`/StandartModules/${config.type}`);
    }
    if (config.path.indexOf(".js") < 0) {
        config.path += ".js";
    }
    return config;
}

function Container(config) {
    config = this.config = config || {};
    if (config.id == "auto") {
        config.id = createUUID();
    }
    if (!this.id) this.id = config.id || createUUID();
    if (!this.type) this.type = config.type || "container";
    if (!this.tags) this.tags = config.tags || [];
    this.selector = this.type + "#" + this.id;
    for (var tag of this.tags){
        this.selector += "." + tag;
    }
    const selector = this.selector;
    const defaultHandler = ()=>{
        //Default handler
    }
    this.handler = config.handler || defaultHandler;
    this.storage = config.storage || {} //Default storage for sub containers and other
    this.modules = [];
    XRouter.apply(this, arguments);

    var self = this;

    this.log = function () {
        const newArguments = [
            selector,
            ...arguments
        ]
        console.log.apply(this, newArguments);
    };

    this.debug = function () {
        const newArguments = [
            selector,
            ...arguments
        ]
        console.debug.apply(this, newArguments);
    };

    this.info = function () {
        const newArguments = [
            selector,
            ...arguments
        ]
        console.info.apply(this, newArguments);
    };

    this.error = function () {
        const newArguments = [
            selector,
            ...arguments
        ]
        console.error.apply(this, newArguments);
    };

    /*
        this.follow(this.type + "#" + this.id, "self");
        this.follow("#" + this.id, "self");
        this.follow(this.type + "#" + this.localId, "self");
        this.follow("#" + this.localId, "self");
        this.follow(this.type, "self");
    */
    //Starting services by config
}

Inherit(Container, XRouter, {
    async init(config){
        if (config && Array.isArray(config.modules)) {
            for (var module of config.modules) {
                this.initModule(parsePath(module));
            }
        }
    },

    async initModule(module){
        if (!module) return;
        let result = null;
        if (typeof module == "function"){
            if (module.constructor) {
                result = new module(this);
            } else {
                if (module instanceof Promise){
                    result = await module.call(this, module);
                } else {
                    result = module.call(this, module);
                }
            }
            return;
        }
        if (typeof module == "object" && module.path) {
            const object = require(Path.resolve(module.path));
            if (typeof object == "function") {
                if (object.constructor) {
                    result = new object(this, module);
                } else {
                    if (object instanceof Promise){
                        result = await object.call(this, module);
                    } else {
                        result = object.call(this, module);
                    }
                }
            }
        }
        if (result && typeof result == 'object') this.modules.push(result);
        return result;
    },

    async load(){
        for (var module of this.modules){
            if (typeof module.load == "function"){
                await module.load(this);
            }
        }
    },

    async unload(){
        for (var module of this.modules){
            if (typeof module.unload == "function"){
                await module.unload(this);
            }
        }
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
/*
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
*/


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
