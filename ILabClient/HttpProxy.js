ServicesManager = {
    StartService : function (serviceId, callback) {
        ServicesManager.instance.StartService(serviceId, callback);
    },

    StopService : function (serviceId, callback) {
        ServicesManager.instance.StopService(serviceId, callback);
    },

    GetServices : function (serviceId, callback) {
        ServicesManager.instance.GetServices(serviceId, callback);
    },

    GetService : function (name, callback) {
        NET.GET("http://localhost:5000/" + name, function(proxyObj, err){
            if (callback){
                if (err != 200){
                    callback(null, this.responseText);
                    return;
                }

                var proxy = {};
                for (var item in proxyObj){
                    if (proxyObj[item] == "method") {
                        proxy[item] = ServicesManager._createFakeMethod(name, item);
                    }
                }
                callback(proxy);
            }
        });
    },

    _createFakeMethod : function(serviceName, methodName) {
        var self = this;
        var method = function () {
            let callbackHandler = null;
            let errorHandler = null;
            let args = [];

            //The callback function should be last
            for (var i = 0; i < arguments.length; i++){
                if (typeof (arguments[i]) == "function"){
                    if (callbackHandler){
                        errorHandler = arguments[i];
                        break;
                    }
                    else {
                        callbackHandler = arguments[i];
                        continue;
                    }
                }
                args.push(arguments[i]);
            }

            NET.POST("http://localhost:5000/" + serviceName + "/" + methodName, JSON.stringify(args), function(result, err){
                if (callbackHandler){
                    if (err != 200){
                        callbackHandler(null, this.responseText);
                    }
                    else{
                        callbackHandler(result);
                    }
                }
            });
        };
        return method;
    },
}

WS.DOMload(function(){
    ServicesManager.GetService("ServicesManager", function(manager){
        ServicesManager.instance = manager;
        if (typeof ServicesManager.onconnected == "function"){
            ServicesManager.onconnected(manager);
        }
    });
});