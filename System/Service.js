var fs = useSystem('fs');
var JsonSocket = useModule('jsonsocket');
var net = useSystem('net');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
var util = useModule('utils');
const stream = require('stream');
var ServiceProxy = useRoot('System/ServiceProxy');

Service = function(params){
    var self = this;
    if (!this.serviceId) {
        if (params && params.id) {
            if (params.id == "auto") {
                this.serviceId = useSystem('uuid/v4')();
            } else {
                this.serviceId = params.id;
            }
        } else {
            if (Frame.serviceId) {
                this.serviceId = Frame.serviceId;
            } else {
                this.serviceId = useSystem('uuid/v4')();
            }
        }
    }
    this.port = Frame.servicePort;
    this._netServerForBaseInteraction = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    }, this._onConnection.bind(this));
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
        this._netServerForBaseInteraction.listen(this.port, function () {
            //console.log("Service listener ready -- " + self.serviceId + ":" + self.port);
        });
    }
    catch (error){
        throw ("Cannot start " + this.serviceId + " on " + this.port + "\n" + error.message);
    }
    process.once("exiting", () =>{
        self._closeServer();
    });
    process.once("exit", () =>{
        self._closeServer();
    });
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

Service.CreateProxyObject = function (service) {
    if (!service) return {};
    var obj = { serviceId : service.serviceId };
    if (service.id){
        obj.id = service.id;
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
    return obj;
};

Inherit(Service, EventEmitter, {
    connect: function (serviceId) {
        return ServiceProxy.connect(serviceId);
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
        var messageHandlerFunction = function (message) {
            if (message.type == "method" || message.type == "stream"){
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
                                socket.write({"type": "stream",  id: message.id, length: result.length});
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
                        socket.write({"type": "stream",  id: message.id, length: result.length});
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
                        socket.write({"type": "result", id: message.id, result: result})
                    }
                }
            }
            if (message.type == "startup") {
                var proxy = Service.CreateProxyObject(self);
                socket.write(proxy);
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
        this._netServerForBaseInteraction.close();
        this.emit("closing-server");
    },

    emit: function (eventName) {
        if (eventName != "error" && eventName != "internal-event") {
            var args = Array.from(arguments);
            //args.shift();
            Service.base.emit.call(this, "internal-event", eventName, args);
        }
        Service.base.emit.apply(this, arguments);
    }
});

module.exports = Service;