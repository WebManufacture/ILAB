var fs = require('fs');
var net = require('net');
var Path = require('path');
var EventEmitter = require('events');

if (!global.useModule){
    require("../System/FrameBase.js");
}

var JsonSocket = useModule('jsonsocket');
var util = useModule('utils');
var Selector = useModule('selectors');
var XRouter = useSystem('XRouter');

Service = function(params){
    var self = this;
    this._config = params ? params : {};

    this.serviceType = this._config.type ? this._config.type : this.classType;

    this.GetDescription = function () {
        return Service.GetDescription(self);
    };

    this.container = require("container");
    this.channel = self.serviceType;

    return EventEmitter.call(this);
};

Service.GetDescription = function (service) {
    var obj = { serviceId : service.serviceId };
    if (service.id){
        obj.id = service.id;
    }
    if (service._eventsDescriptions){
        obj._events = JSON.parse(JSON.stringify(service._eventsDescriptions));
    }
    for (var item in service){
        if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
            if (service[item].isStreamMethod){
                obj[item] = "method";
            }
            else {
                obj[item] = "method";
            }
        }
    }
    if (service._config){
        obj._config = service._config
    }
    return obj;
}

Service.CreateProxyObject = function (service) {
    if (!service) return {};
    if (service.GetDescription) {
        return service.GetDescription();
    } else {
        return Service.GetDescription(service);
    }
};

Inherit(Service, EventEmitter, {

    init: function(descriptor){
        var service = this;

        this.container.onSelf(this.channel, (message, selector)=> {
            if (!selector) {
                this.processMessage(message);
            }
        });

        this.container.onSelf(this.channel + "/response", (message)=> {
            this.processResult(message);
        });

        for (var item in service) {
            if (service.hasOwnProperty(item) && typeof (service[item]) == "function" && item.indexOf("_") != 0 ) {
                descriptor[item] = 'method';
                this._subscribeMethod(service, item);
            }
        }
    },

    _subscribeMethod: function(service, name){
        this.container.onSelf("/" + name + "/call", (message)=>{
            service.callMethodHandler(message.id, name, message.data, message);
        });
    },

    processMessage: function(message){
        //return this.externalMessageHandler(message.data);
    },

    connect: function (serviceSelector) {
        if (!serviceSelector) return null;
        if (typeof serviceSelector == 'string') {
            serviceSelector = new Selector(serviceSelector);
        }
        var self = this;
        return new Promise(function(resolve, reject){
            self.container.send(serviceSelector, {
                from: "/" + self.serviceType + "#" + self.serviceId,
                to: serviceSelector,
                type: XRouter.TYPE_LOOKUP
            });
            let proxyObject = new Proxy({
                _path : serviceSelector
            }, {
                get(target, prop) {
                    if (prop === 'then') return null; //TO PREVENT PROMISE CALLS
                    if (prop in target) {
                        return target[prop];
                    } else {
                        return function () {
                            return self.callRemote(prop, arguments);
                        }
                    }
                }
            });
            resolve(proxyObject);
        });
    },

    callRemote: function(name, args){
        var self = this;
        return new Promise((resolve, reject) => {
            // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
            var id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");
            var obj =
                {
                    id : id,
                    from: "/self/" + self.channel,
                    to: "/self/" + name + "/call#" + id,
                    data: args
                };
            this.once("result#" + id, (message, xmessage) => {
                if (message.type == "result") {
                    resolve(message.result);
                }
                if (message.type == "stream") {
                    socket.goStreamMode();
                    message.stream = socket.netSocket;
                    message.stream.length = message.length;
                    if (message.encoding){
                        socket.netSocket.setEncoding(message.encoding);
                    }
                    else {
                        socket.netSocket.setEncoding(null);
                        /* fix due to issues in node */
                        socket.netSocket._readableState.decoder = null;
                        socket.netSocket._readableState.encoding = null;
                    }
                    resolve(message.stream);
                }
                if (message.type == "error") {
                    var err = new Error(message.result);
                    console.log("Error while calling", xmessage.from);
                    if (message.stack){
                        err.stack = message.stack;
                    }
                    //console.error(err);
                    reject(err);
                }
            });
            self.container.route(obj);
        });
    },

    processResult: function(message){
        self.emit("result#" + message.id, message.data, message);
    },

    callMethodHandler: function(id, name, args, message){
        var response =
            {
                id : id,
                from: message.to,
                to: message.from + "/response#" + id,
            };
        var self = this;
        const sendResponse = (data)=> {
            response.data = data;
            return self.container.route(response);
        };
        try {
            this._calleeFunctionMessage = message;
            var result = self._callMethod(name, args);
            this._calleeFunctionMessage = null;
        }
        catch (err){
            if (id) {
                return sendResponse({"type": "error", id: id, result: err, message: err.message, stack: err.stack});
            }
            return;
        }
        if (result instanceof Promise){
            result.then(function (result) {
                try {
                    return sendResponse({"type": "result", id: id, result: result});
                }
                catch (error){
                    throw error;
                }
            }).catch(function (error) {
                if (typeof error == "string") {
                    return sendResponse({"type": "error", id: id, result: error, message: error});
                }
                else {
                    return sendResponse({"type": "error", id: id, result: error.message, message: error.message, stack: error.stack});
                }
            });
        }
        else {
            return sendResponse({"type": "result", id: id, result: result});
        }
    },

    createStreamMethod : function (func) {
        func.isStreamMethod = true;
        return func;
    },

    _callMethod : function (name, args){
        if (typeof this[name] == "function"){
            return this[name].apply(this, args);
        }
        this.emit("error", new Error(this.serviceId + ":" + this.port + ":" + name + " proxy called undefined method"));
        return undefined;
    },

    /*
    emit: function (eventName) {
        if (eventName != "error" && eventName != "internal-event") {
            var args = Array.from(arguments);
            //args.shift();
            Service.base.emit.call(this, "internal-event", eventName, args);
        } else {
            //Self-descriptive events
            if (!this._eventsDescriptions) this._eventsDescriptions = {};
            if (!this._eventsDescriptions[eventName]){
                var args = [];
                for (var i = 0; i <= arguments.length; i++){
                    args.push({
                        type: typeof arguments[i]
                    });
                }
                this.register(eventName, {
                    args: args
                });
            }
        }
        Service.base.emit.apply(this, arguments);
    },*/

    register: function (eventName, description) {
        if (eventName) {
            if (!this._eventsDescriptions) this._eventsDescriptions = {};
            this._eventsDescriptions[eventName] = description;
        }
    },

    info: function (key, description) {
        if (key) {
            if (!this._config) this._config = {};
            this._config[key] = description;
        }
    },
});

module.exports = Service;

if (!module.parent) {
    return new Service();
}
