var fs = require('fs');
var JsonSocket = useModule('jsonsocket');
var net = require('net');
var Path = require('path');
var EventEmitter = require('events');
var util = useModule('utils');
var Selector = useModule('selectors');
const stream = require('stream');
var ServiceProxy = useSystem('ServiceProxy');
var XRouter = useSystem('XRouter');

Service = function(params){
    var self = this;
    this._config = {};
    this._eventsDescriptions = {};
    this.register("error", {
        args: [
            {
                type: "object",
                title: "error object or message"
            }
        ],
    });
    this.parseParams(params);

    var route = {
        id: this.serviceId,
        type: this.serviceType,
        rank: 10,
        provider: this.routeMessage.bind(this.router)
    };
    process.router.addRoute(route);

    this.register("exiting", {
        description: "occurs when service process like to exit",
        args: []
    });

    var wasExiting = false;
    process.once("SIGTERM", () =>{
        if (!wasExiting){
            wasExiting = true;
            self._closeServer();
        };
        process.exit();
    });
    process.once("SIGINT", () =>{
        if (!wasExiting){
            wasExiting = true;
            self._closeServer();
        };
        process.exit();
    });
    process.once("exiting", () =>{
        if (!wasExiting) {
            wasExiting = true;
            self.emit("exiting");
            self._closeServer();
        }
    });
    process.once("exit", () =>{
        if (!wasExiting){
            wasExiting = true;
            self.emit("exiting");
            self._closeServer();
        }
    });
    this.GetDescription = function () {
        return Service.GetDescription(self);
    }
    return EventEmitter.call(this);
};

Service.States = ["loading", "killed", "exited", "paused", "error", "reserved", "stopping", "working"];
Service.STATUS_LOADING = 0;
Service.STATUS_KILLED = 1;
Service.STATUS_EXITED = 2;
Service.STATUS_PAUSED = 3;
Service.STATUS_ERROR = 4;
Service.STATUS_STOPPING = 6;
Service.STATUS_WORKING = 7;

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
    parseParams: function(params){
        if (!this.serviceType){
            this.serviceType = params.type ? params.type : this.constructor.name;
            //console.log("This class is " + this.constructor.name);
        }
        if (!this.serviceId) {
            if (params && params.id) {
                if (params.id == "auto") {
                    this.serviceId = require('uuid/v4')();
                } else {
                    this.serviceId = params.id;
                }
            } else {
                this.serviceId = require('uuid/v4')();
            }
        }
        if (this.id) {
            this.id = this.serviceId;
        }
        return this.id;
    },

    connect: function (serviceSelector) {
        if (!serviceSelector) return null;
        if (typeof serviceSelector == 'string') {
            serviceSelector = new Selector(serviceSelector);
        }
        return new Promise((resolve, reject)=>{
            this.routeMessage(serviceSelector, XRouter.,{ type: "lookup" });
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
        return process.router.routeMessage({
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

    _onConnection  : function(socket){
        var self = this;
        //console.log(this.serviceId + ":" + this.port + " connection");
        socket = new JsonSocket(socket);

        var errorHandler = function(err){
            self.emit("error", err);
        };
        socket.on("error", errorHandler);

        var goStreamMode = (message, result) => {
            socket.write({"type": "stream",  id: message.id, length: result.length});
            socket.removeListener('messageHandlerFunction', messageHandlerFunction);
            messageHandlerFunction = (message) => {
                if (message.type == "stream-started"){
                    if (result.encoding){
                        socket.netSocket.setEncoding(result.encoding);
                    }
                    else {
                        socket.netSocket.setEncoding('binary');
                    }
                    if (result instanceof stream.Readable) {
                        result.pipe(socket.netSocket);
                    }
                    if (result instanceof stream.Writable) {
                        socket.netSocket.pipe(result);
                    }
                } else {
                    throw new Error("Reusable socket detected after go stream mode")
                }
            };
            socket.on('json', messageHandlerFunction);

        };

        var messageHandlerFunction = function (message) {
            if (message.type == "method"){
                try {
                    this._calleeFunctionMessage = message;
                    var result = self._callMethod(message.name, message.args);
                    this._calleeFunctionMessage = null;
                }
                catch (err){
                    if (message.id) {
                        socket.write({"type": "error", id: message.id, result: err, message: err.message, stack: err.stack});
                    }
                    return;
                }
                if (result instanceof Promise){
                    result.then(function (result) {
                        try {
                            if (result instanceof stream.Readable || result instanceof stream.Writable) {
                                goStreamMode(message, result);
                            }
                            else {
                                socket.write({"type": "result", id: message.id, result: result});
                            }
                        }
                        catch (error){
                            throw error;
                        }
                    }).catch(function (error) {
                        if (typeof error == "string") {
                            socket.write({"type": "error", id: message.id, result: error, message: error});
                        }
                        else {
                            socket.write({"type": "error", id: message.id, result: error.message, message: error.message, stack: error.stack});
                        }
                    });
                }
                else {
                    if (result instanceof stream.Readable || result instanceof stream.Writable) {
                        goStreamMode(message, result);
                    } else {
                        socket.write({"type": "result", id: message.id, result: result})
                    }
                }
            }
            if (message.type == "startup") {
                var proxy = Service.CreateProxyObject(self);
                if (proxy) {
                    socket.write(proxy);
                }
            }
            if (message.type == "subscribe") {
                self.on("internal-event", internalEventHandler);
            }
        };
        var internalEventHandler = function (eventName, args) {
            //args.shift();
            try {
                if (!socket.closed) {
                    socket.write({
                        type: "event",
                        name: eventName,
                        calleeId: this._calleeFunctionMessage ? this._calleeFunctionMessage.id : null,
                        calleeName: this._calleeFunctionMessage ? this._calleeFunctionMessage.name : null,
                        args: args});
                }
            } catch(err){
               //errorHandler(err);
            }
        };
        var serverClosingHandler = function (eventName, args) {
            socket.end();
        };
        socket.on("json", messageHandlerFunction);
        self.once("closing-server", serverClosingHandler);

        socket.once("close", function (isError) {
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        socket.once("end", function (isError) {
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        process.once("exit", function(){
            socket.end();
            socket.close(true);
        });
    },

    _closeServer : function(){
        //this._pipesServerForBaseInteraction.close();
        //console.log("exiting:closing " + process.pipeId);
        //this.emit("closing-server");
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