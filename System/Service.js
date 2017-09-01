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
    this.serviceId = Frame.serviceId;
    this.port = Frame.servicePort;
    this.server = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    }, this._onConnection.bind(this));
    try {
        this.server.listen(this.port, function () {
            console.log("Service listener ready -- " + self.serviceId + ":" + self.port);
        });
    }
    catch (error){
        throw ("Cannot start " + this.serviceId + " on " + this.port + "\n" + error.message);
    }
    return EventEmitter.call(this);
};

Service.CreateProxyObject = function (service) {
    if (!service) return {};
    var obj = { serviceId : service.serviceId };
    for (var item in service){
        if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
            obj[item] = "method";
        }
    }
    return obj;
};

Inherit(Service, EventEmitter, {
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
            if (message.type == "method"){
                try {
                    var result = self._callMethod(message.name, message.args);
                }
                catch (err){
                    if (message.id) {
                        socket.write({"type": "error", id: message.id, result: err});
                    }
                    return;
                }
                if (result instanceof Promise){
                    result.then(function (result) {
                        try {
                            if (result instanceof stream.Readable) {
                                socket.write({"type": "stream",  id: message.id, length: result.length});
                                result.pipe(socket);
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
                            socket.write({"type": "error", id: message.id, result: error});
                        }
                        else {
                            socket.write({"type": "error", id: message.id, result: error.message, stack: error.stack});
                        }
                    });
                }
                else {
                    if (message.id) {
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
            if (message.type == "stream") {

            }
        };
        var internalEventHandler = function (eventName, args) {
            socket.write({ type: "event", name : eventName, args : args});
        };
        socket.once("json", messageHandlerFunction);
        socket.once("close", function (isError) {
            self.removeListener("internal-event", internalEventHandler);
            this.removeListener("json", messageHandlerFunction);
            this.removeListener("error", errorHandler);
        });
        process.once("exit", function(){
            socket.close(true);
        });
        self.once("closing-server", function(){
            socket.end();
        });
    },

    _closeServer : function(){
        this.server.close();
        this.emit("closing-server");
    },

    emit: function (eventName) {
        if (eventName != "error" && eventName != "internal-event") {
            Service.base.emit.call(this, "internal-event", eventName, Array.from(arguments));
        }
        Service.base.emit.apply(this, arguments);
    }
});

module.exports = Service;