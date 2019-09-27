var fs = require('fs');
var JsonSocket = useModule('jsonsocket');
var net = require('net');
var Path = require('path');
var EventEmitter = require('events');
var util = useModule('utils');
const stream = require('stream');
var ServiceProxy = useSystem('ServiceProxy');

Service = function(params){
    var self = this;
    this._config = params;
    this._eventsDescriptions = {};

    this.register("error", {
        args: [
            {
                type: "object",
                title: "error object or message"
            }
        ],
    });
    if (params.type){
        this.serviceType = params.type;
    } else {
        this.serviceType = this.constructor.name;
    }
    if (!this.serviceId) {
        if (params && params.id) {
            if (params.id == "auto") {
                this.serviceId = require('uuid/v4')();
            } else {
                this.serviceId = params.id;
            }
        } else {
            if (Frame.serviceId) {
                this.serviceId = Frame.serviceId;
            } else {
                this.serviceId = require('uuid/v4')();
            }
        }
    }
    //console.log(process.channel);
    this._pipesServerForBaseInteraction = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    });
    this._pipesServerForBaseInteraction.on("connection", (socket) => {
        self._onConnection(socket);
    });
    this.port = Frame.servicePort;
    this._netServerForBaseInteraction = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    });
    this._netServerForBaseInteraction.on("connection", (socket) => {
        self._onConnection(socket);
    });
    self.setMaxListeners(100);
    this._netServerForBaseInteraction.on("error", function (err) {
        try {
            self.emit('error', err);
        }
        catch (e){
            console.log(err);
            console.error(e);
        }
    });
    try {
        var pipeId = Frame.pipeId;
        this._pipesServerForBaseInteraction.listen(pipeId, function () {
            Frame.log("Listening pipe " + pipeId);
        });
        this.pipe = pipeId;
        this._netServerForBaseInteraction.listen(this.port, function () {
            console.log("Service listener ready -- " + self.serviceId + ":" + self.port);
        });
    }
    catch (error){
        throw ("Cannot start " + this.serviceId + " on " + this.port + "\n" + error.message);
    }
    this.register("exiting", {
        description: "occurs when service process like to exit",
        args: []
    });
    var wasExiting = false;
    process.once("SIGTERM", () =>{
        if (!wasExiting){
            wasExiting = true;
            console.log("SIGTERM:closing " + Frame.pipeId);
            self._closeServer(true);
        };
        process.exit();
    });
    process.once("SIGINT", () =>{
        if (!wasExiting){
            wasExiting = true;
            console.log("SIGINT:closing " + Frame.pipeId);
            self._closeServer(true);
        };
        process.exit();
    });
    process.once("exiting", () =>{
        if (!wasExiting) {
            wasExiting = true;
            console.log("exiting:closing " + Frame.pipeId);
            self.emit("exiting");
            self._closeServer(true);
        }
    });
    process.once("exit", () =>{
        if (!wasExiting){
            wasExiting = true;
            console.log("exit:closing " + Frame.pipeId);
            self.emit("exiting");
            self._closeServer(true);
        }
    });
    this.GetDescription = function (addConfig) {
        return Service.GetDescription(self, addConfig);
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

Service.GetDescription = function (service, addConfig) {
    var obj = { serviceId : service.serviceId, serviceType : service.serviceType, tcpPort: service.port };
    if (service.id){
        obj.id = service.id;
    }
    if (service.pipe){
        obj._pipe = service.pipe;
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
    if (service._config && addConfig){
        obj._config = service._config
    }
    return obj;
}

Service.CreateProxyObject = function (service, addConfig) {
    if (!service) return {};
    if (service.GetDescription) {
        return service.GetDescription(addConfig);
    } else {
        return Service.GetDescription(service, addConfig);
    }
};

Inherit(Service, EventEmitter, {
    connect: function (serviceId) {
        return ServiceProxy.connect(serviceId);
    },

    routeLocal: function(serviceId, packet){
        //var socket = new JsonSocket(node.data.tcpPort, "127.0.0.1", function (err) {
        var socket = new JsonSocket(Frame.getPipe(serviceId), function (err) {
            //console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
            try {
                socket.write(packet);
                socket.end();
            }
            catch(err){
                console.error(err);
            }
        });
    },

    routeInternal: function(message){
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
                        socket.goStreamMode(message.id);
                        socket.netSocket.pipe(result);
                    }
                } else {
                    throw new Error("Reusable socket detected after go stream mode")
                }
            };
            socket.on('json', messageHandlerFunction);

        }

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
                if (!socket.closed && !socket.destroyed && socket.writable) {
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
            socket.closed = true;
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        socket.once("end", function (isError) {
            socket.closed = true;
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        process.once("exit", function(){
            socket.end();
            socket.close(true);
        });
    },

    _closeServer : function(preventSending){
        if (!preventSending) {
            this.emit("closing-server");
        } else {
            this.closed = true;
        }
        this._netServerForBaseInteraction.close();
        this._pipesServerForBaseInteraction.close();
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
    }
});

module.exports = Service;