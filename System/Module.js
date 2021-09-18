var fs = require('fs');
var net = require('net');
useRoot('/Utils/utils.js');
useRoot('/Utils/selectors.js');
var XRouter = useRoot('/Utils/XRouter.js');

Module = function(container, config){
    var self = this;
    this.config = config || {};
    this.type = config.type;

    let defaultHandler = container.handler;

    const init = (container) => {
        for (var key in this) {
            if (!{}.hasOwnProperty(key) && typeof (this[key]) == "function" && key.indexOf("_") != 0 ) {
                if (key == 'handler') {
                    container.handler = this.handler;
                    continue;
                }
                container.storage[key] = this[key];
                container.on(XRouter.TYPE_CALL, "@" + key, this[key]);
            }
        }
    };

    this.init = init;

    this.load = () => {

    };

    this.unload = () => {
        container.handler = defaultHandler;
        for (var key in this) {
            if (!{}.hasOwnProperty(key) && typeof (this[key]) == "function" && key.indexOf("_") != 0 ) {
                if (key == 'handler') {
                    continue;
                }
                delete container.storage[key];
                container.un(XRouter.TYPE_CALL, "@" + key, this[key]);
            }
        }
    };

    this.getDescription = () => {
        return Module.GetDescription(self);
    };
/*

    _subscribeMethod: function(service, name){
        this.container.onSelf("/" + name, (message)=>{
            service.callMethodHandler(message.id, name, message.data, message);
        });
    },

    processMessage: function(message){
        //return this.externalMessageHandler(message.data);
    },

    connect: function (serviceSelector) {
        if (!serviceSelector) return null;
        if (typeof serviceSelector == 'string') {
            serviceSelector = new Selector(serviceSelector);
        }
        var self = this;
        return new Promise(function(resolve, reject){
            self.container.send(serviceSelector, {
                from: "/" + self.serviceType + "#" + self.serviceId,
                to: serviceSelector,
                type: XRouter.TYPE_LOOKUP
            });
            let proxyObject = new Proxy({
                _path : serviceSelector
            }, {
                get(target, prop) {
                    if (prop === 'then') return null; //TO PREVENT PROMISE CALLS
                    if (prop in target) {
                        return target[prop];
                    } else {
                        return function () {
                            return self.callRemote(prop, arguments);
                        }
                    }
                }
            });
            resolve(proxyObject);
        });
    },

    callRemote: function(name, args){
        var self = this;
        return new Promise((resolve, reject) => {
            // при использовании промисов, ответа на сообщения мы ждём ВСЕГДА (что идеологически правильнее)
            var id = Date.now().valueOf() + (Math.random()  + "").replace("0.", "");
            var obj =
            {
                id : id,
                from: "/self/" + self.channel,
                to: "/self/" + name + "/call#" + id,
                data: args
            };
            this.once("result#" + id, (message, xmessage) => {
                if (message.type == "result") {
                    resolve(message.result);
                }
                if (message.type == "stream") {
                    socket.goStreamMode();
                    message.stream = socket.netSocket;
                    message.stream.length = message.length;
                    if (message.encoding){
                        socket.netSocket.setEncoding(message.encoding);
                    }
                    else {
                        socket.netSocket.setEncoding(null);
                        socket.netSocket._readableState.decoder = null;
                        socket.netSocket._readableState.encoding = null;
                    }
                    resolve(message.stream);
                }
                if (message.type == "error") {
                    var err = new Error(message.result);
                    console.log("Error while calling", xmessage.from);
                    if (message.stack){
                        err.stack = message.stack;
                    }
                    //console.error(err);
                    reject(err);
                }
            });
            self.container.route(obj);
        });
    },

    processResult: function(message){
        self.emit("result#" + message.id, message.data, message);
    },

    callMethodHandler: function(id, name, args, message){
        var response =
        {
            id : id,
            from: message.to,
            to: message.from + "/response#" + id,
        };
        var self = this;
        const sendResponse = (data)=> {
            response.data = data;
            return self.container.route(response);
        };
        try {
            this._calleeFunctionMessage = message;
            var result = self._callMethod(name, args);
            this._calleeFunctionMessage = null;
        }
        catch (err){
            if (id) {
                return sendResponse({"type": "error", id: id, result: err, message: err.message, stack: err.stack});
            }
            return;
        }
        if (result instanceof Promise){
            result.then(function (result) {
                try {
                    return sendResponse({"type": "result", id: id, result: result});
                }
                catch (error){
                    throw error;
                }
            }).catch(function (error) {
                if (typeof error == "string") {
                    return sendResponse({"type": "error", id: id, result: error, message: error});
                }
                else {
                    return sendResponse({"type": "error", id: id, result: error.message, message: error.message, stack: error.stack});
                }
            });
        }
        else {
            return sendResponse({"type": "result", id: id, result: result});
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
    },*/
};

Module.GetDescription = function (module) {
    return { source: module.config.path, type: module.type };
}

Module.CreateProxyObject = function (service) {
    if (!service) return {};
    if (service.GetDescription) {
        return service.GetDescription();
    } else {
        return Service.GetDescription(service);
    }
};

Inherit(Module, {

});

module.exports = Module;
