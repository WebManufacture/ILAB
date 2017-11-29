var JsonSocket = useModule('jsonsocket');
var EventEmitter = useSystem('events');
var net = useSystem('net');
var util = useModule('utils');

ServiceProxy = function(serviceName){
    this.startParams = arguments;
    this.serviceId = serviceName;
    this.state = "detached";
    this.timeout = 10000; // время ожидания ответа (мс), для удалённых сервисов можно увеличивать, для локальных - уменьшать
    this.waiting = []; // очередь отправленных сообщений ждущих ответа
    this.connectionsCount = 0;
    var result = EventEmitter.call(this);
    this.on("error", function () {

    });
    return result;
};

ServiceProxy.instance = null;

ServiceProxy.connected = false;

ServiceProxy._connectingPromise = null;

ServiceProxy.init = function (port, host) {
    if (!ServiceProxy.instance && (!Frame || !Frame.servicesManagerPort)) return null;
    if (ServiceProxy.instance){
        if (!ServiceProxy.connected) return ServiceProxy._connectingPromise;
        else return new Promise(function(resolve, reject) {
            return resolve(ServiceProxy.instance);
        });
    };
    if (!port) port = Frame.servicesManagerPort;
    if (!host) host = 'localhost';
    ServiceProxy.instance = new ServiceProxy("ServicesManager");
    var self = this;
    ServiceProxy._connectingPromise = ServiceProxy.instance.attach(port, host).then(function () {
        ServiceProxy.connected = true;
        ServiceProxy._connectingPromise = null;
        return ServiceProxy.instance
    });
    return ServiceProxy._connectingPromise;
};

ServiceProxy.connect = function (pointer) {
    var serviceId = '';
    var port = null;
    var host = 'localhost';
    if (typeof pointer == "number"){
        port = pointer;
    }
    if (typeof pointer == "string") {
        if (pointer.indexOf(":") > 0){
            pointer = pointer.split(':');
            host = pointer[0];
            port = parseInt(pointer[1]);
        }
        else {
            serviceId = pointer;
            return ServiceProxy.GetService(serviceId);
        }
    }
    var instance = new ServiceProxy(serviceId);
    return instance.attach(port, host);
};

ServiceProxy.GetService = function (serviceName) {
    var callFunc = function (services) {
        if (services && services[serviceName]){
            var proxy = new ServiceProxy(serviceName);
            return proxy.attach(services[serviceName], ServiceProxy.instance.host);
        }
        else{
            this.reject("service " + serviceName + " not found");
        }
    };
    if (!ServiceProxy.instance) {
        return ServiceProxy.init().then(function(instance) {return instance.GetServices() }).then(callFunc);
    }
    if (!ServiceProxy.connected) return null;
    return ServiceProxy.GetServices().then(callFunc);
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

Inherit(ServiceProxy, EventEmitter, {
    _callMethod : function (methodName, args) {
        var self = this;
        return new Promise(function (resolve, reject) {
            try {
                function raiseError(err) {
                    console.log("Socket error while calling " + self.serviceId + ":" + self.port + ":" + methodName);
                    console.error(err);
                    socket.removeAllListeners();
                    socket.close();
                    self.emit('error', err);
                    reject(err);
                }

                // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
                var obj = { "type" : "method", name : methodName, args : args};
                //Сделаем ID немного иначе и тогда будет можно на него положиться
                obj.id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");
                var socket = new JsonSocket(self.port, self.host, function () {
                    try {
                        socket.send(obj);
                    }
                    catch (err) {
                        raiseError(err);
                    }
                });
                socket.on('error', raiseError);
                socket.once("close", function (err) {
                    if (err) {
                        console.log("Socket closed unexpectely " + self.serviceId + ":" + self.port + ":" + methodName);
                        reject(new Error("Socket closed unexpectely " + self.serviceId + ":" + self.port + ":" + methodName));
                    }
                });
                socket.once("json", function (message) {
                    if (message.type == "result") {
                        socket.removeAllListeners();
                        socket.close();
                        resolve(message.result);
                    }
                    if (message.type == "stream" && message.id) {
                        message.stream = socket.netSocket;
                        socket.netSocket.setEncoding('binary');
                        resolve(message.stream);
                    }
                    if (message.type == "error") {
                        raiseError(message.result)
                    }
                });
            }
            catch (err) {
                self.emit('error', err);
                reject(err);
            }
        });
    },

    _createFakeMethod : function(methodName, methodType) {
        var self = this;
        var method = self[methodName] = function () {
            let callbackHandler = null;
            let errorHandler = null;
            let args = [];
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
        this.port = port;
        if (!port) throw new Error("Unknown port to attach in " + this.serviceId);
        if (!host) host = "127.0.0.1";
        this.host = host;
        var self = this;
        var promise = new Promise(
            function (resolve, reject) {
                try {
                    var socket = new JsonSocket(port, host, function (err) {
                        console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
                        try {
                            socket.write({"type": "startup", args: self.startParams});
                        }
                        catch(err){
                            raiseError(err);
                        }
                    });
                    function raiseError(err) {
                        console.log("Socket error while attach to " + self.serviceId + ":" + self.port);
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
                        self.serviceId = proxyObj.serviceId;
                        if (self.serviceId != "ServicesManager") {
                            console.log(Frame.serviceId + ": Service proxy connected to " + self.serviceId);
                        }
                        for (var item in proxyObj) {
                            if (proxyObj[item] == "method" || proxyObj[item] == "stream") {
                                self._createFakeMethod(item, proxyObj[item]);
                            }
                        }
                        if (typeof callback == "function") {
                            callback.call(self, proxyObj);
                        }
                        self._attachEventListener("*");
                        self.attached = true;
                        self.emit("connected", proxyObj);
                        socket.close();
                        resolve(self);
                    });
                }
                catch (err) {
                    self.emit('error', err);
                }
            }).catch(function (err) {
                self.emit('error', err);
            });
        return promise;
    },

    _attachEventListener: function (eventName) {
        this.connectionsCount++;
        var self = this;
        try {
            var promise = new Promise(function (resolve, reject) {
                function raiseError(err) {
                    console.log("Socket error in event listener " + self.serviceId + ":" + self.port);
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
                    self.connectionsCount--;
                    console.log("Socket Closed at " + self.serviceId + ":" + self.port + ":" + self.connectionsCount);
                    console.log("Waiting queue " + self.waiting.length);
                    console.log(err);
                    setImmediate(()=>{
                        self._attachEventListener(eventName);
                    });
                });
                var messageHandlerFunction = function (message) {
                    if (message.type == "event") {
                        self.emit.apply(self, message.args);
                    }
                    if (message.type == "error") {
                        raiseError(message);
                    }
                };
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