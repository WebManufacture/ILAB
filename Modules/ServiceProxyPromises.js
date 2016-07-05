var JsonSocket = useModule('jsonsocket');
var EventEmitter = useSystem('events');
var net = useSystem('net');
var util = useModule('utils');

ServiceProxyPromises = function(){
    this.startParams = arguments;
    this.state = "detached";
    this.timeout = 4000; // время ожидания ответа (мс), для удалённых сервисов можно увеличивать, для локальных - уменьшать
    this.m_id=0; // id последнего отправленного сообщения (из тех которым нужен ответ)
    this.waiting = []; // очередь отправленных сообщений ждущих ответа
    return EventEmitter.call(this);
};

ServiceProxyPromises.CreateProxyObject = function (service) {
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

Inherit(ServiceProxyPromises, EventEmitter, {
    _createFakeMethod : function(methodName, resultNeeds) {
        var self = this;
        var method = self[methodName] = function () {
            var args = [];
            for (var i = 0; i < arguments.length; i++){
                args.push(arguments[i]);
            }
            
            // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
            var obj = { "type" : "method", name : methodName, args : args, id:++self.m_id };
            self.emit("external-call", obj);
            
            var p = self.waiting[self.m_id] = { req:obj, time: Date.now() }; 
            var promise = new Promise( 
                function(resolve, reject) { 
                    p._onResult = resolve; // вызовется если до таймаута успеет прийти ответ
                    p._timer = setTimeout(() => { 
                                       delete self.waiting[p.req.id];
                                       console.log("Не дождались ответа на " + JSON.stringify(p.req));
                                       reject(new Error("не дождались ответа")); // или Error не нужно?
                                    }, self.timeout);
                } 
            );
            return promise;
        };
        return method;
    },
    
    attach : function (port, host, callback) {
        this.port = port;
        if (!host) host = "127.0.0.1";
        this.host = host;
        var self = this;
        
        var socket = new JsonSocket(port, host, function () {
            console.log("Service proxy connecting to " + port);
        });
        var handshakeFinished = false;
        socket.on('error', function(err){
            self.emit('error', err);
        });
        socket.once("json", function (proxyObj) {
            //console.dir(proxyObj);//debug
            self.serviceId = proxyObj.serviceId;
            console.log("Service proxy connected to " + self.serviceId);
            for (var item in proxyObj){
                if (proxyObj[item] == "method") {
                    self._createFakeMethod(item, proxyObj[item]);
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
            // console.log(message); // debug
            
            if (handshakeFinished)
            {
                if(message.then=="event") {
                    self.emit.apply(self, message.args);
                }
                
                if (message.type == "result" && message.id){ // vk
                    var p = self.waiting[message.id];
                    if(p)
                    {   clearTimeout(p._timer);
                        p._onResult(message.result);
                        delete self.waiting[message.id];
                    };
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

module.exports = ServiceProxyPromises;