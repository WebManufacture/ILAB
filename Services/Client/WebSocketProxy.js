ServiceProxy = function(serviceName){
    this.startParams = arguments;
    this.serviceId = serviceName;
    this.state = "detached";
    this.timeout = 5000; // время ожидания ответа (мс), для удалённых сервисов можно увеличивать, для локальных - уменьшать
    this.waiting = []; // очередь отправленных сообщений ждущих ответа
    this.connectionsCount = 0;
    return EventEmitter.call(this);
};

ServiceProxy.Connect = function(url, serviceId){
    var proxy = new ServiceProxy(serviceId);
    return proxy.attach(url + "/" + serviceId);
};

ServiceProxy.connected = false;

ServiceProxy.Init = function(url){
    ServiceProxy.instance = new ServiceProxy("ServicesManager");
    return ServiceProxy.instance.attach(url + "/ServicesManager").then(function(proxy){
        ServiceProxy.connected = true;
        window.ServicesManager = proxy;
        ServicesManager.Connect = ServiceProxy.Connect;
        return proxy.GetServices().then(function(services){
            ServicesManager.Services = services;
            return ServicesManager;
        });
    });
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

                self.once("external-result-" + obj.id, (event, resultArgs) => {
                    delete self.waiting[obj.id];
                    clearTimeout(_timer);
                    resolve(resultArgs);
                });

                self.once("external-error-" + obj.id, (event, message) => {
                    delete self.waiting[obj.id];
                    clearTimeout(_timer);
                    reject(message.result + "\n" + message.stack);
                });
            });

            if (callbackHandler) promise.then(callbackHandler);
            if (errorHandler) promise.catch(errorHandler);

            return promise;
        };
        return method;
    },

    attach : function (url) {
        this.connectionsCount++;
        if (!url) throw new Error("Unknown url to attach in " + url);
        this.url = url;
        var self = this;
        var handshakeFinished = false;

        var socket = new WebSocket(url);

        socket.onerror = function(event){
            console.log("Socker error at " + self.serviceId + ":" + url);
            console.error(event);
            self.emit('error', event);
            socket.close();
        };

        socket.onmessage = function (message) {
            //console.dir(proxyObj);//debug
            var proxyObj = JSON.parse(message.data);
            self.serviceId = proxyObj.serviceId;
            //if (self.serviceId != "ServicesManager")
            console.log("Service proxy connected to " + url);
            for (var item in proxyObj){
                if (proxyObj[item] == "method") {
                    self._createFakeMethod(item, proxyObj[item]);
                }
            }
            console.log(proxyObj);
            socket.send(JSON.stringify({"type": "startup", args : self.startParams}));
            self.emit("connected", proxyObj);
            handshakeFinished = true;
            socket.onmessage = messageHandlerFunction;
        };

        var methodCallFunction = function (event, obj, onResultFunction) {
            socket.send(JSON.stringify(obj));
        };

        self.on("external-call", methodCallFunction);

        var messageHandlerFunction = function (message) {
            // console.log(message); // debug
            message = JSON.parse(message.data);
            if (handshakeFinished)
            {
                if(message.type == "event") {
                    self.emit.apply(self, message.args);
                }
                if (message.type == "result" && message.id){
                    self.emit("external-result", message);
                    self.emit("external-result-" + message.id, message.result);
                }
                if (message.type == "error"){
                    self.emit("external-error", message);
                    if (message.id){
                        self.emit("external-error-" + message.id, message.result, message.stack);
                    }
                }
            }
        };

        socket.onclose = function (event, isError) {
            if (event.wasClean) {
                console.log('Соединение закрыто чисто');
            } else {
                console.error('Обрыв соединения'); // например, "убит" процесс сервера
            }
            console.log('Код: ' + event.code + ' причина: ' + event.reason);
            self.emit("close", event);
        };

        var promise = new Promise(
            function(resolve, reject) {
                var connectedHandler = function () {
                    self.un("error", errorHandler);
                    resolve(self);
                };
                var errorHandler = function (args) {
                    self.un("connected", connectedHandler);
                    reject(args);
                };
                self.once("connected", connectedHandler);
                self.once("error", errorHandler);
                return socket;
            }
        );

        this.socket = socket;

        return promise;
    },

    close : function(){
        if (this.socket){
            this.socket.close();
        }
    }
    /*on : function (message, func) {

     return this.base.on.apply(this, args);
     }*/
});