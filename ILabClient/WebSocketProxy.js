ServiceProxy = function(serviceName){
    this.startParams = arguments;
    this.serviceId = serviceName;
    this.state = "detached";
    this.timeout = 5000; // время ожидания ответа (мс), для удалённых сервисов можно увеличивать, для локальных - уменьшать
    this.waiting = []; // очередь отправленных сообщений ждущих ответа
    this.connectionsCount = 0;
    this.handlers = {};
};

ServiceProxy.Connect = function(url, serviceId){
    if (url.indexOf("ws://") < 0){
        serviceId = url;
        if (ServiceProxy.connected){
            url = ServiceProxy.url;
        } else {
            url = "ws://localhost:5700/"
        }
    } else {

    }
    var proxy = new ServiceProxy(serviceId);
    if (serviceId){
        serviceId = "/" + serviceId;
    }
    else{
        serviceId = '';
    }
    return proxy.attach(url + serviceId);
};

ServiceProxy.connected = false;

ServiceProxy.Init = function(url){
    if (!url) url = "";
    ServiceProxy.url = url;
    ServicesManager = ServiceProxy.instance = new ServiceProxy("ServicesManager");
    ServicesManager.Connect = ServiceProxy.Connect;
    return ServicesManager.attach(url ? url + "/ServicesManager" : "ws://localhost:5700/ServicesManager").then(function(proxy){
        if (proxy) {
            for (var item in proxy){
                if (proxy.hasOwnProperty(item)){
                    ServicesManager[item] = proxy[item];
                }
            }
            ServiceProxy.connected = true;
            return proxy.GetServices().then(function (services) {
                ServicesManager.Services = services;
                return ServicesManager;
            });
        }
        else{
            throw ("Unexpected null object without error when initing ServiceProxy")
        }
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

ServiceProxy.prototype = {
    _getSocket(){
        var self = this;
        if (this.tunnel) return this.tunnel;

        function raiseError(err) {
            console.error("Socket error on " + self.url + " while calling " + self.serviceId);
            console.log(err);
            socket.close();
            self.emit('error', err);
        }

        var socket = new WebSocket(self.url);
        socket.onerror = raiseError;
        socket.onclose = function (event) {
            this.tunnel = null;
            if (event.wasClean) {
                console.log('Соединение закрыто чисто');
            } else {
                console.error('Обрыв соединения' + ' Код: ' + event.code + ' причина: ' + event.reason); // например, "убит" процесс сервера
            }
        };
        socket.onmessage = function (message) {
            message = JSON.parse(message.data);
            self.emit("message", message);
        };
        window.addEventListener("close", ()=>{
          socket.close();
        })
        self.tunnel = socket;
        return socket;
    },

    _callMethod : function (methodName, args) {
        var self = this;
        return new Promise(function (resolve, reject) {
            try {
                function raiseError(err) {
                    console.error("Error on " + self.url + " while calling " + self.serviceId + ":" + methodName);
                    console.log(err);
                }

                const socket = self._getSocket();

                // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
                var obj = { "type" : "method", name : methodName, args : args};
                //Сделаем ID немного иначе и тогда будет можно на него положиться
                obj.id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");

                function messageHandler(message) {
                    if (message.type == "result" && message.id == obj.id) {
                        self.un("message", messageHandler);
                        resolve(message.result);
                    }
                    if (message.type == "stream" && message.id == obj.id) {
                        self.un("message", messageHandler);
                        socket.onmessage = null;
                        self.tunnel = null;
                        resolve(socket);
                    }
                    if (message.type == "error" && message.id == obj.id) {
                        self.un("message", messageHandler);
                        raiseError(message);
                        reject(err);
                    }
                };

                self.on("message", messageHandler);

                function sendPacket(){
                  if (socket.readyState == 1){
                    socket.send(JSON.stringify(obj));
                  } else {
                    setTimeout(function() {
                      try{
                        sendPacket();
                      }
                      catch (err) {
                        raiseError(err);
                      }
                    }, 10);
                  }
                }

                try {
                  sendPacket();
                }
                catch (err) {
                    raiseError(err);
                }
            }
            catch (err) {
                self.emit('error', err);
                reject(err);
            }
        })
    },


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

            var promise = this._callMethod(methodName, args);

            if (callbackHandler) promise.then(callbackHandler);
            if (errorHandler) promise.catch(errorHandler);

            return promise;
        };
        return method;
    },

    attach : function (url) {
        if (!url) throw new Error("Unknown url to attach in " + url);
        if (url.indexOf("ws://") != 0){
            url = "ws://" + url;
        }
        this.url = url;
        var self = this;
        var promise = new Promise(
            function (resolve, reject) {
                try {
                    var socket = new WebSocket(url);
                    socket.onopen = function(event){
                        //console.log(self.serviceId + ": Service proxy opened connection to " + url);
                        try {
                            socket.send(JSON.stringify({"type": "startup", args: self.startParams}));
                        }
                        catch(err){
                            raiseError(err);
                        }
                    };
                    function raiseError(err) {
                        console.error("Socket error at " + self.serviceId + ":" + url);
                        console.log(event);
                        self.emit('error', event);
                        //socket.tunnel = null;
                        socket.close();
                        reject(err);
                    };
                    socket.onerror = raiseError;
                    socket.onmessage = function (message) {
                        //console.dir(proxyObj);//debug
                        var proxyObj = JSON.parse(message.data);
                        if (proxyObj.type !== "error"){
                            self.serviceId = proxyObj.serviceId;
                            //if (self.serviceId != "ServicesManager")
                            console.log(self.serviceId + ": Service proxy connected to " + url);
                            for (var item in proxyObj){
                                if (proxyObj[item] == "method") {
                                    self._createFakeMethod(item, proxyObj[item]);
                                }
                            }
                            if (typeof callback == "function") {
                                callback.call(self, proxyObj);
                            }
                            self.attached = true;
                            console.log(proxyObj);
                            self.emit("connected", proxyObj);
                            socket.close();
                            //self.tunnel = socket;
                            resolve(self);
                        } else {
                            console.log(proxyObj.result);
                            self.emit('error', proxyObj.result);
                            socket.close();
                            reject(proxyObj.result);
                        }
                    };
                    socket.onclose = function (event, isError) {
                        //self.tunnel = null;
                        if (event.wasClean) {
                            console.log('Соединение закрыто чисто');
                        } else {
                            console.error('Обрыв соединения' + ' Код: ' + event.code + ' причина: ' + event.reason); // например, "убит" процесс сервера
                        }
                    };
                    self._attachEventListener("*");
                }
                catch (err) {
                    self.emit('error', err);
                }
            });
        return promise;
    },

    _attachEventListener: function (eventName) {
        this.connectionsCount++;
        var self = this;
        try {
            var promise = new Promise(function (resolve, reject) {
                function raiseError(err) {
                    console.error("Event socket error at " + self.serviceId + ":" + self.url);
                    console.log(err);
                    self.emit('error', err);
                    eventSocket.close();
                    reject(err);
                }
                var eventSocket = this.eventSocket = new WebSocket(self.url);
                eventSocket.onopen = function () {
                    try {
                        //console.log(self.serviceId + ": EventListener attached to " + self.url + " : " + eventName);
                        eventSocket.send(JSON.stringify({"type": "subscribe", name: eventName}));
                    }
                    catch (err){
                        raiseError(err);
                    }
                    resolve("subscribed");
                };
                var messageHandlerFunction = function (message) {
                    message = JSON.parse(message.data);
                    if (message.type == "event") {
                        self.emit.apply(self, message.args);
                    }
                    if (message.type == "error") {
                        raiseError(message);
                    }
                };
                eventSocket.onerror = raiseError;
                eventSocket.onmessage = messageHandlerFunction;
                eventSocket.onclose = function (event) {
                    self.connectionsCount--;
                    if (event.wasClean) {
                        console.log('Event cоединение закрыто чисто');
                        setTimeout(()=>{
                            self._attachEventListener(eventName);
                        }, 3000);
                    } else {
                        console.error('Обрыв event соединения' + ' Код: ' + event.code + ' причина: ' + event.reason); // например, "убит" процесс сервера
                    }
                    self.emit("event-close", event);
                };
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

    close : function(){
        if (this.eventSocket){
            this.eventSocket.close();
        }
    },

    bind : function(){
        var event = arguments[0];
        for (var i = 0; i < arguments.length; i++){
            arguments[i] = arguments[i+1];
        }
        arguments.length--;
        var handler = CreateClosure.apply(this, arguments);
        this.on(event, handler);
    },

    once : function(event, handler){
        handler._eventFlagOnce = true;
        this.on(event, handler);
    },


    clear : function(event){
        if (!this.handlers[event]) return false;
        this.handlers[event] = null;
        return true;
    },

    on : function(event, handler){
        if (typeof(event) == "function"){
            this.handler = event;
            event = "*";
        }
        if (event && typeof(handler) == "function") {
            event = event + "";
            if (!this.handlers[event]){
                this.handlers[event] = [];
            }
            this.handlers[event].push(handler);
        }
    },

    un : function(handler){
        for (var event in this.handlers) {
            this._unsubscribeHandler(event, handler);
        }
    },

    _unsubscribeHandler : function(event, handler){
        for (var i = 0; i < this.handlers[event].length; i++){
            if (this.handlers[event][i] == handler){
                this.handlers[event][i].splice(i, 1);
                i--; continue;
            }
        }
    },

    emit : function(){
        var event = "*";
        if (this.handlers[event] && this.handlers[event].length ){
            for (var i = 0; i < this.handlers[event].length; i++){
                var handler = this.handlers[event][i];
                if (handler._eventFlagOnce){
                    this.handlers[event].splice(i, 1);
                    i--;
                }
                handler.apply(this, arguments);
            }
        }
        event = arguments[0];
        if (this.handlers[event] && this.handlers[event].length ){
            for (var i = 0; i < arguments.length; i++){
                arguments[i] = arguments[i+1];
            }
            arguments.length--;
            for (var i = 0; i < this.handlers[event].length; i++){
                var handler = this.handlers[event][i];
                if (handler._eventFlagOnce){
                    this.handlers[event].splice(i, 1);
                    i--;
                }
                handler.apply(this, arguments);
            }
        }

    },
    /*on : function (message, func) {

     return this.base.on.apply(this, args);
     }*/
};
