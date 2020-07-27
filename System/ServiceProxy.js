var JsonSocket = useModule('jsonsocket');
var EventEmitter = require('events');
var net = require('net');
var util = useModule('utils');

ServiceProxy = function(serviceName, keepConnected){
    this._startParams = arguments;
    this._serviceId = serviceName;
    this._keepConnected = keepConnected;
    this._state = "detached";
    this._timeout = 10000; // время ожидания ответа (мс), для удалённых сервисов можно увеличивать, для локальных - уменьшать
    this._waiting = []; // очередь отправленных сообщений ждущих ответа
    this._connectionsCount = 0;
    var result = EventEmitter.call(this);
    this.on("error", function () {

    });
    return result;
};

ServiceProxy.instance = null;

ServiceProxy.connected = false;

ServiceProxy._connectingPromise = null;

ServiceProxy.init = function (port, host) {
    if (!ServiceProxy.instance && (!Frame || !Frame.rootId)) return null;
    if (ServiceProxy.instance){
        if (!ServiceProxy.connected) return ServiceProxy._connectingPromise;
        else return new Promise(function(resolve, reject) {
            return resolve(ServiceProxy.instance);
        });
    };
    ServiceProxy.instance = new ServiceProxy(Frame.rootId);
    var self = this;
    ServiceProxy._connectingPromise = ServiceProxy.instance.attach(Frame.getPipe(Frame.rootId)).then(function () {
        ServiceProxy.connected = true;
        ServiceProxy._connectingPromise = null;
        return ServiceProxy.instance
    });
    return ServiceProxy._connectingPromise;
};

ServiceProxy.connect = ServiceProxy.GetService = function (pointer, keepAlive) {
    var serviceId = '';
    var port = null;
    var host = 'localhost';
    if (typeof pointer == "number") {
        port = pointer;
    }
    if (typeof pointer == "string") {
        if (pointer.indexOf(":") > 0) {
            pointer = pointer.split(':');
            host = pointer[0];
            port = parseInt(pointer[1])
        }
        else {
            serviceId = pointer;
            var proxy = new ServiceProxy(serviceId);
            var pipe = Frame.getPipe(serviceId);
            return proxy.attach(pipe).then(()=>{
                if (proxy._tcpPort){
                    var port = proxy._tcpPort;
                    console.log("Connecting " + serviceId + " using socket on 127.0.0.1:" + port);
                    proxy._closeConnection();
                    proxy = new ServiceProxy(serviceId, keepAlive);
                    return proxy.attach(port, "127.0.0.1")
                }
                return proxy;
            });
        }
    }
    var instance = new ServiceProxy(serviceId, keepAlive);
    console.log("Connecting " + serviceId + " using socket on " + host + ":" + port);
    return instance.attach(port, host);
};


ServiceProxy.GetServices = function () {
    if (!ServiceProxy.instance) {
        return ServiceProxy.init().then(function(instance) {return instance.GetServices() });
    }
    if (!ServiceProxy.connected) return null;
    return ServiceProxy.instance.GetServices();
};


ServiceProxy.CreateProxyObject = function (service) {
    if (!service) return {};
    var obj = { serviceId : service.serviceId };
    for (var item in service){
        if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
            obj[item] = "method";
        }
    }
    /* на случай если в контракте понадобятся методы класса сервиса, а не только его экземпляра
     service = service.__proto__;
     for (var item in service){
     if (item.indexOf("_") != 0 && typeof (service[item]) == "function" && service.hasOwnProperty(item)){
     obj[item] = "method";
     }
     }
     */
    return obj;
};

ServiceProxy.CallMethod = function (host, port, methodName, args) {
    var self = {
        host: host,
        port: port,
        serviceId: "SingleCall",
        emit: function () {

        }
    };
    return ServiceProxy.prototype._callMethod.call(self, methodName, args);
},

Inherit(ServiceProxy, EventEmitter, {
    _callMethod : function (methodName, args) {
        var self = this;
        // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
        var obj = { "type" : "method", name : methodName, args : args};
        //Сделаем ID немного иначе и тогда будет можно на него положиться
        obj.id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");
        var promise = new Promise(function (resolve, reject) {
            try {
                function raiseError(err) {
                    console.log("Socket error while calling " + self._serviceId + ":" + self.port + ":" + methodName);
                    console.error(err);
                    socket.removeAllListeners();
                    socket.close();
                    self.socket = null;
                    self.emit('error', err);
                    reject(err);
                }
                var socket = self._socket;
                if (!self._keepConnected || !self._socket){
                    var socket = typeof self.port == "number" ? new JsonSocket(self.port, self.host) : new JsonSocket(self.port);

                    socket.once("connect", function () {
                        try {
                            socket.send(obj);
                        }
                        catch (err) {
                            raiseError(err);
                        }
                    });
                }
                socket.on('error', raiseError);
                socket.once("close", function (err) {
                    if (err) {
                        console.log("Socket closed unexpectely " + self._serviceId + ":" + self.port + ":" + methodName);
                        reject(new Error("Socket closed unexpectely " + self._serviceId + ":" + self.port + ":" + methodName));
                    }
                });
                socket.once("json", function (message) {
                    socket.removeAllListeners();
                    if (message.type == "result") {
                        if (!self._keepConnected) {
                            socket.close();
                        }
                        resolve(message.result);
                    }
                    if (message.type == "stream" && message.id) {
                        socket.goStreamMode();
                        var obj = { type : "stream-started", id: message.id};
                        message.stream = socket.netSocket;
                        message.stream.length = message.length;
                        if (message.encoding) {
                            socket.netSocket.setEncoding(message.encoding);
                        }
                        else {
                            socket.netSocket.setEncoding(null);
                            /* fix due to issues in node */
                            socket.netSocket._readableState.decoder = null;
                            socket.netSocket._readableState.encoding = null;
                        }
                        socket.send(obj);
                        resolve(message.stream);
                    }
                    if (message.type == "error") {
                        var err = new Error(message.result);
                        console.log("Error while calling " + self._serviceId + ":" + self.port + ":" + methodName + ( message.stack ? " with stack " : " no stack "));
                        if (message.stack) {
                            err.stack = message.stack;
                        }
                        self.emit('error', err);
                        reject(err);
                    }
                });
            }
            catch (err) {
                self.emit('error', err);
                reject(err);
            }
        });
        promise.before = function (f) {
            if (typeof f == "function"){
                f.call(self, promise, obj);
            }
            return promise;
        };
        promise._callId = obj.id;
        return promise;
    },

    _createFakeMethod : function(methodName, methodType) {
        var self = this;
        var method = self[methodName] = function () {
            var callbackHandler = null;
            var errorHandler = null;
            var args = [];
            //The callback function should be last
            for (var i = 0; i < arguments.length; i++){
                if (typeof (arguments[i]) == "function"){
                    if (callback){
                        errorHandler = arguments[i];
                        break;
                    }
                    else {
                        callbackHandler = arguments[i];
                    }
                }
                args.push(arguments[i]);
            }

            if (methodType == 'method') {
                var promise = self._callMethod(methodName, args);

                if (callbackHandler) promise.then(callbackHandler);
                if (errorHandler) promise.catch(errorHandler);

                return promise;
            }
        };
        return method;
    },

    attach : function (port, host, callback) {
        if (typeof port == "string"){
            if (!isNaN(parseInt(port))){
                port = parseInt(port);
            }
        }
        this.port = port;
        if (!port) throw new Error("Unknown port to attach in " + this._serviceId);
        var self = this;
        var promise = new Promise(
            function (resolve, reject) {
                try {
                    if (typeof port == "number") {
                        if (!host) host = "127.0.0.1";
                        self.host = host;
                    }
                    var socket = typeof port == "number" ? new JsonSocket(port, host) : new JsonSocket(port);
                    socket.once("connect",function (err) {
                        //console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
                        try {
                            socket.write({"type": "startup", args: self._startParams});
                        }
                        catch(err){
                            raiseError(err);
                        }
                    });
                    function raiseError(err) {
                        console.log("Socket error while attach to " + self._serviceId + ":" + self.port);
                        console.error(err);
                        socket.removeAllListeners();
                        socket.close();
                        reject(err);
                    }
                    socket.on('error', raiseError);
                    socket.once("json", function (proxyObj) {
                        if (proxyObj.type == 'error'){
                            raiseError(proxyObj.result);
                            return;
                        }
                        self._serviceId = proxyObj.serviceId;
                        self._serviceType = proxyObj.serviceType;
                        self._tcpPort = proxyObj.tcpPort;
                        self._socket = socket;
                        self._closeConnection = ()=>{
                            self._socket = null;
                            socket.close();
                        };
                        if (self._serviceId != "ServicesManager") {
                            //console.log(Frame.serviceId + ": Service proxy connected to " + self.serviceId);
                        }
                        for (var item in proxyObj) {
                            if (proxyObj[item] == "method" || proxyObj[item] == "stream") {
                                self._createFakeMethod(item, proxyObj[item]);
                            }
                        }
                        if (proxyObj._config) {
                            self.config = proxyObj._config;
                        }
                        if (proxyObj._events) {
                            self.events = proxyObj._events;
                        }
                        if (typeof callback == "function") {
                            callback.call(self, proxyObj);
                        }
                        self._attachEventListener("*");
                        self.attached = true;
                        self.emit("connected", proxyObj);
                        if (!self._keepConnected) {
                            self._socket = null;
                            socket.close();
                        }
                        resolve(self);
                    });
                }
                catch (err) {
                    self.emit('error', err);
                    throw(err);
                }
            }).catch(function (err) {
                self.emit('error', err);
                throw(err);
            });
        return promise;
    },

    _attachEventListener: function (eventName) {
        this._connectionsCount++;
        var self = this;
        try {
            var promise = new Promise(function (resolve, reject) {
                function raiseError(err) {
                    console.log("Socket error in event listener " + self._serviceId + ":" + self.port);
                    console.error(err);
                    eventSocket.removeAllListeners();
                    eventSocket.close(err);
                    reject(err);
                }
                var eventSocket = new JsonSocket(self.port, self.host, function () {
                    try {
                        eventSocket.write({"type": "subscribe", name: eventName});
                    }
                    catch (err){
                        raiseError(err);
                    }
                    resolve("subscribed");
                });
                eventSocket.on('error', function (err) {
                    raiseError(err);
                });
                eventSocket.once("close", function (err) {
                    self._connectionsCount--;
                    if (err) {
                        //console.log("EventSocket error " + err + " at " + self.serviceId + ":" + self.port + ":" + self.connectionsCount);
                        setImmediate(() => {
                            self._attachEventListener(eventName);
                        });
                    }
                    else{
                        //console.log("EventSocket closed success at " + self.serviceId + ":" + self.port + ":" + self.connectionsCount);
                    }
                });
                var messageHandlerFunction = function (message) {
                    if (message.type == "event") {
                        self._calleeFunctionId = message.calleeId;
                        self._calleeFunctionName = message.calleeName;
                        self.emit.apply(self, message.args);
                        delete self._calleeFunctionId;
                        delete self._calleeFunctionName;
                    }
                    if (message.type == "error") {
                        raiseError(message);
                    }
                };
                process.once("exiting", ()=> {
                    eventSocket.end();
                });
                process.once("exit", ()=> {
                    eventSocket.end();
                });
                eventSocket.on("json", messageHandlerFunction);
            });
        }
        catch (err) {
            self.emit('error', err);
        }
        promise.catch(function (err) {
            self.emit('error', err);
        });
        return promise;
    },


    /*on : function (message, func) {

     return this.base.on.apply(this, args);
     }*/
});

module.exports = ServiceProxy;
