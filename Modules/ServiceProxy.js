var JsonSocket = useModule('jsonsocket');
var EventEmitter = useSystem('events');
var net = useSystem('net');
var util = useModule('utils');

ServiceProxy = function(){
    this.startParams = arguments;
    this.state = "detached";
    return EventEmitter.call(this);
};

ServiceProxy.CreateProxyObject = function (service) {
    if (!service) return {};
    var obj = { serviceId : service.serviceId };
    for (var item in service){
        if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
            obj[item] = "method";
        }
    }
    return obj;
};

Inherit(ServiceProxy, EventEmitter, {
    attach : function (port, host, callback) {
        this.port = port;
        if (!host) host = "127.0.0.1";
        this.host = host;
        var self = this;
        function createFakeMethod(methodName, resultNeeds) {
            var method = self[methodName] = function () {
                var args = [];
                for (var i = 0; i < arguments.length; i++){
                    args.push(arguments[i]);
                }
                var obj = { "type" : "method", name : methodName, args : args };
                self.emit("external-call", obj);
            };
            return method;
        }
        var socket = new JsonSocket(port, host, function () {
            console.log("Service proxy connecting to " + port);
        });
        var handshakeFinished = false;
        socket.on('error', function(err){
            self.emit('error', err);
        });
        socket.once("json", function (proxyObj) {
            self.serviceId = proxyObj.serviceId;
            console.log("Service proxy connected to " + self.serviceId);
            for (var item in proxyObj){
                if (proxyObj[item] == "method") {
                    createFakeMethod(item, proxyObj[item]);
                }
            }
            if (typeof callback == "function") {
                callback.call(self, proxyObj);
            }
            socket.write({"type": "startup", args : self.startParams});
            handshakeFinished = true;
        });
        var methodCallFunction = function (obj) {
            socket.write(obj);
        };
        self.on("external-call", methodCallFunction);
        var messageHandlerFunction = function (message) {
            if (handshakeFinished && message.type == "event"){
                var result = self._callMethod(message.name, message.args);
                if (message.id) {
                    socket.write({"type": "result", id: message.id, result: result})
                }
            }
        };
        socket.on("json", messageHandlerFunction);
        socket.once("close", function (isError) {
            self.removeListener("external-call", methodCallFunction);
            this.removeListener("json", messageHandlerFunction);
        });
    }
    /*on : function (message, func) {

        return this.base.on.apply(this, args);
    }*/
});

module.exports = ServiceProxy;