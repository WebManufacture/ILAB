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
const stream = require('stream');
var ServiceProxy = useSystem('ServiceProxy');
var XRouter = useSystem('XRouter');

Service = function(params){
    var self = this;
    this._config = params ? params : {};

    this.GetDescription = function () {
        return Service.GetDescription(self);
    }

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
    connect: function (serviceSelector) {
        if (!serviceSelector) return null;
        if (typeof serviceSelector == 'string') {
            serviceSelector = new Selector(serviceSelector);
        }
        return new Promise((resolve, reject)=>{
            this.routeMessage(serviceSelector, XRouter.TYPE_LOOKUP,{ type: "lookup" });
            this.on("message-result", ()=>{

            });
        });
    },

    routeMessage: function(destination, messageType, content){
        //var socket = new JsonSocket(node.data.tcpPort, "127.0.0.1", function (err) {
        /*var socket = new JsonSocket(process.getPipe(serviceId), function (err) {
            //console.log(process.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
            try {
                socket.write(packet);
                socket.end();
            }
            catch(err){
                console.error(err);
            }
        });*/
        return this.router.routeMessage({
            id : Date.now().valueOf() + (Math.random()  + "").replace("0.", ""),
            source : this.serviceType + "#" + this.serviceId,
            type: messageType,
            destination: destination,
            content: content
        });
    },

    routeDefault: function(message){
        if (message.type == "method"){
            try {
                this._calleeFunctionMessage = message;
                var result = self._callMethod(message.name, message.args);
                this._calleeFunctionMessage = null;
            }
            catch (err){
                if (message.id) {
                    return ({"type": "error", id: message.id, result: err, message: err.message, stack: err.stack});
                }
                return;
            }
            if (result instanceof Promise){
                result.then(function (result) {
                    try {
                        return ({"type": "result", id: message.id, result: result});
                    }
                    catch (error){
                        throw error;
                    }
                }).catch(function (error) {
                    if (typeof error == "string") {
                        return ({"type": "error", id: message.id, result: error, message: error});
                    }
                    else {
                        return ({"type": "error", id: message.id, result: error.message, message: error.message, stack: error.stack});
                    }
                });
            }
            else {
                return {"type": "result", id: message.id, result: result};
            }
        }
        if (message.type == "startup") {
            return Service.CreateProxyObject(self);
        }
        if (message.type == "subscribe") {
            //self.on("internal-event", internalEventHandler);
        }
        if (message.type == "result"){
            self.emit("message-result", message);
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
    },

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
