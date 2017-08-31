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
    return EventEmitter.call(this);
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
    _createFakeMethod : function(methodName) {
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

            var promise = new Promise(function (resolve, reject) {
                // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
                var obj = { "type" : "method", name : methodName, args : args};
                obj.id = Date.now() + (Math.random()  + "").replace("0.", "");//Сделаем ID немного иначе и тогда будет можно
                self.emit("external-call", obj);


                self.waiting[obj.id] = { req:obj, time: Date.now() };

                var _timer = setTimeout(() => {
                    delete self.waiting[obj.id];
                    console.log("Не дождались ответа на " + JSON.stringify(obj));
                    reject("Timeout error"); // или Error не нужно?
                }, self.timeout);

                self.once("external-result-" + obj.id, (resultArgs) => {
                    delete self.waiting[obj.id];
                    clearTimeout(_timer);
                    resolve(resultArgs);
                });

                self.once("external-stream-" + obj.id, (message) => {
                    delete self.waiting[obj.id];
                    clearTimeout(_timer);
                    resolve(message);
                });

                self.once("external-error-" + obj.id, (message, stack) => {
                    delete self.waiting[obj.id];
                    clearTimeout(_timer);
                    reject(message + "\n" + stack);
                });
            });

            if (callbackHandler) promise.then(callbackHandler);
            if (errorHandler) promise.catch(errorHandler);

            return promise;
        };
        return method;
    },

    attach : function (port, host, callback) {
        this.connectionsCount++;
        this.port = port;
        if (!port) throw new Error("Unknown port to attach in " + this.serviceId);
        if (!host) host = "127.0.0.1";
        this.host = host;
        var self = this;

        var socket = new JsonSocket(port, host, function () {
            console.log(Frame.serviceId + ": Service proxy for " + self.serviceId + " connecting to " + port);
        });
        var handshakeFinished = false;
        socket.on('error', function(err){
            console.log("Socker error at " + self.serviceId + ":" + self.port + ":" + self.connectionsCount);
            console.log("Waiting queue " + self.waiting.length);
            console.error(err);
            self.emit('error', err);
            socket.end();
        });
        socket.once("json", function (proxyObj) {
            //console.dir(proxyObj);//debug
            self.serviceId = proxyObj.serviceId;
            //if (self.serviceId != "ServicesManager")
                console.log(Frame.serviceId + ": Service proxy connected to " + self.serviceId);
            for (var item in proxyObj){
                if (proxyObj[item] == "method") {
                    self._createFakeMethod(item, proxyObj[item]);
                }
            }
            if (typeof callback == "function") {
                callback.call(self, proxyObj);
            }
            socket.write({"type": "startup", args : self.startParams});
            self.emit("connected", proxyObj);
            handshakeFinished = true;
        });
        var methodCallFunction = function (obj, onResultFunction) {
            socket.write(obj);
        };
        self.on("external-call", methodCallFunction);

        var messageHandlerFunction = function (message) {
            // console.log(message); // debug

            if (handshakeFinished)
            {
                if(message.type == "event") {
                    self.emit.apply(self, message.args);
                }
                if (message.type == "result" && message.id){
                    self.emit("external-result", message);
                    self.emit("external-result-" + message.id, message.result);
                }
                if (message.type == "stream" && message.id){
                    self.emit("external-stream", message);
                    message.stream = socket.netSocket;
                    self.emit("external-stream-" + message.id, message);
                }
                if (message.type == "error"){
                    self.emit("external-error", message);
                    if (message.id){
                        self.emit("external-error-" + message.id, message.result, message.stack);
                    }
                }
            }
        };
        socket.on("json", messageHandlerFunction);

        socket.once("close", function (isError) {
            //self.removeListener("external-call", methodCallFunction);
            //this.removeListener("json", messageHandlerFunction);
            self.connectionsCount--;
            console.log("Socket Closed at " + self.serviceId + ":" + port + ":" + self.connectionsCount);
            console.log("Waiting queue " + self.waiting.length);
            setImmediate(()=>{self.attach(self.port, self.host)})
        });

        var promise = new Promise(
            function(resolve, reject) {
                var connectedHandler = function () {
                    self.removeListener("error", errorHandler);
                    resolve(self);
                };
                var errorHandler = function (args) {
                    self.removeListener("connected", connectedHandler);
                    reject(args);
                };
                self.once("connected", connectedHandler);
                self.once("error", errorHandler);
                return self;
            }
        );

        return promise;
    }
    /*on : function (message, func) {

     return this.base.on.apply(this, args);
     }*/
});

ServiceProxy.init();

module.exports = ServiceProxy;