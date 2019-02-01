var Selector = useModule("Selectors.js");

function Channel(route){
    this.name = route;
    this.routes = { $path : "/" };
}

global.Channel = Channel;
//Channel.RegExp = /^((?:(?:[a-z\d\-_*])*\/?)*)?([<>])?(#[a-z\d\-_]+)?((?:\.[a-z\d\-_]+)*$)/;
//Channel.RegExp.compile();
//ChannelMessage.RegExp = /^((?:(?:[a-z\d\-_])*\/?)*)?(#[a-z\d\-_]+)?((?:\.[a-z\d\-_]+)*$)/;
//ChannelMessage.RegExp = /^((?:(?:[a-z\d\-_])*(?:\.[a-z\d\-_]+)*\/?)*)?$)/;
//ChannelMessage.RegExp.compile();


Channel.RouteNode = function(route){
    route = route.replace(/\$/ig, ""); //Чтобы предотвратить перезапись внутренних функций в узлах
    this.source = route;
    this.type = "*";
    this.tags = [];
    this.components = [];
    if (route){
        route = route.split(".");
        if (route.length > 0){
            if (route[0] != ""){
                this.type = route[0].toLowerCase();
            }
            route.shift();
            if (this.type.indexOf("#") >= 0){
                this.id = this.type.substr(this.type.indexOf("#"));
                this.type = this.type.substr(0, this.type.indexOf("#"));
                this.components.push(this.id);
            }
            this.components.push(this.type);
            var i = 0;
            while (i < route.length){
                if (route[i] == ""){
                    route.splice(i, 1);
                }
                else{
                    route[i] = route[i].toLowerCase();
                    this.components.push("." + route[i]);
                    i++;
                }
            }
            this.tags = route;
        }
    }
    this.is = function(other){
        if (other.type != "*" && other.type != this.type) {
            return false;
        }
        for (var i = 0; i < other.tags.length; i++){
            if (this.source.indexOf("." + other.tags[i]) < 0){
                return false;
            }
        }
        return true;
    };
    this.setType = function(otherType){
        this.type = otherType;
        if (this.components.length > 0) this.components[0] = otherType;
    };
};

Channel.RouteNode.prototype.toString = function(){
    var str = this.type;
    if (this.tags.length > 0){
        str += "." + this.tags.join(".");
    }
    return str;
};

Channel.Route = function(route){
    if (!route || route == "") return null;
    if (typeof route != "string"){
        route.push(0);
    }
    if (route.indexOf("/") != 0){
        route = "/" + route;
    }
    this.source = route;
    this.nodes = route.split("/");
    this.nodes.shift();
    this.components = [];
    for (var i = 0; i < this.nodes.length; i++){
        if (this.nodes[i] == "") this.nodes[i] = "*";
        this.nodes[i] = new Channel.RouteNode(this.nodes[i]);
        this.components = this.components.concat(this.nodes[i].components);
    }

};

Channel.Route.prototype = {
    clone : function(){
        var newRoute = new Channel.Route(this.source);
        for (var item in this){
            if (item != "source" && item != "nodes" && item != "components" && !Channel.Route.prototype[item]){
                newRoute[item] = this[item];
            }
        }
        return newRoute;
    },

    is : function(other){
        other = Channel.ParsePath(other);
        thisRoute = Channel.ParsePath(this.source);
        if (thisRoute.nodes.length < other.nodes.length) {
            return false;
        }
        for (var i = 0; i < other.nodes.length; i++){
            if (!thisRoute.nodes[i].is(other.nodes[i])) return false;
        }
        return true;
    }
}


Channel.Route.prototype.toString = function(index){
    var str = "";
    index = parseInt(index);
    if (!isNaN(index) && index >= 0 && index < this.nodes.length){
        for (var i = index; i < this.nodes.length; i++){
            str += "/" + this.nodes[i].toString();
        }
    }
    return str;
};

Channel.ParsePath = function(route){
    if (!route) return null;
    if (typeof route == "string") return new Selector(route);
    if (typeof route == "object"){
        if (route instanceof Channel.RouteNode){
            return new Channel.Route(route);
        }
        if (route instanceof Channel.Route){
            return route;
        }
    }
    return null;
}

Channel.prototype.once = Channel.prototype._single = function(path, callback){
    callback.callMode = "single";
    return this.on(path, callback);
}

Channel.prototype.on = Channel.prototype.for = Channel.prototype.subscribe = Channel.prototype.add = Channel.prototype._addListener = function(srcRoute, callback){
    route = Channel.ParsePath(srcRoute);
    if (!route) return null;
    if (!callback) return null;
    callback.id = (Math.random() + "").replace("0.", "handler");
    var path = [];
    var root = this._createRoute(this.routes, route, path);
    if (root && path.length > 0){
        var result = true;
        /*for (var i = 0; i < path.length; i++){
            var tunnels = path[i]["$tunnels"];
            if (tunnels){
                var j = 0;
                var param = { source: route.source, path : path[i].$path, current : route.source.replace(path[i].$path, "") };
                while (j < tunnels.length){
                    var res = tunnels[j].call(route, param);
                    if (res == null){
                        tunnels.splice(j, 1);
                    }
                    else
                    {
                        if (res == false){
                            result = false;
                            break;
                        }
                    }
                    j++;
                }
                if (result == false) break;
            }
        }*/
        if (typeof srcRoute != 'string') srcRoute = srcRoute.source;
        if (!srcRoute.start("$/") && !srcRoute.start("/$/")){
            if (!srcRoute.start("/")) srcRoute = "/" + srcRoute;
            srcRoute = "$" + srcRoute;
        }
        results = this.emit(srcRoute, route);
        return this._addRouteHandler(root, callback);
    }
    return null;
};

Channel.prototype.un = Channel.prototype.clear = Channel.prototype._removeListeners = function(srcRoute, handler){
    route = Channel.ParsePath(srcRoute);
    if (!route) return null;
    if (route.nodes.length == 0) return null;
    if (!srcRoute.start("$/")){
        if (!srcRoute.start("/")) srcRoute = "/" + srcRoute;
        srcRoute = "$" + srcRoute;
    }
    results = this.emit(srcRoute, "remove", route);
    return this._removeHandler(this._getRoute(this.routes, route), handler);
};

Channel.prototype.onSubscribe = Channel.prototype.tunnelTo = function(route, callback){
    if (!route.start("$/")){
        if (!route.start("/")) route = "/" + route;
        route = "$" + route;
    }
    route = Channel.ParsePath(route);
    if (!route) return null;
    if (!callback) return null;
    return this.on(route, callback);
};

Channel.prototype.emit = Channel.prototype.send = function(route){
    route = this.get.apply(this, arguments);
    if (route) return route.send();
    return null;
}

Channel.prototype.get = function(route){
    var route = Channel.ParsePath(route);
    if (!route) return;
    if (route.nodes.length == 0) return null;
    route.id = (Math.random() + "").replace("0.", "");
    route.callplan = [];
    route.channel = this;
    route.results = [];
    route._endHandlers = [];
    route._handlersCount = 0;

    route._onCompleteFunction = function(){
        this.completed = true;
        for (var i = 0; i < this._endHandlers.length; i++){
            this._endHandlers[i].call(this.channel, this, this.results);
        }
    }
    route.end = function(callback){
        var route = this;
        if (callback){
            if (this._handlersCount > 0){
                this._endHandlers.push(callback);
            }
            else{
                setTimeout(function(){
                    callback.call(channel, route, route.results);
                },2);
            }
        }
    };
    route.send = function(callback){
        if (callback){
            this.end(callback);
        }
        for (var i = this.callplan.length - 1; i >= 0; i--){
            this.callplan[i]();
        }
    };

    route.abort = function(){
        this._addResult = null;
    }
    route.stop = function(){
        this._addResult = null;
        this._onCompleteFunction();
    }
    route._addResult = function(result){
        this.results.push(result);
        this._handlersCount--;
        if (this._handlersCount <= 0){
            this._onCompleteFunction();
        }
    };

    route._handlersCount = this._sendMessage(this.routes, route, 0, arguments);
    if (route._handlersCount == 0) route.completed = true;

    return route;
};

Channel.prototype._addRouteHandler = function(root, callback){
    if (!root) return null;
    if (!callback) return null;
    if (root) {
        if (!root["."]){
            root["."] = [];
        }
        root["."].push(callback);
        return callback;
    }
    return null;
};

Channel.prototype._getRoute = function(root, route, path){
    if (!root) return null;
    if (!route) return null;
    var nodes = route.components;
    for (var i = 0; i < nodes.length; i++){
        var inner = root[nodes[i]];
        if (!inner){
            return null;
        }
        if (path) path.push(inner);
        root = inner;
    }
    return root;
};

Channel.prototype._createRoute = function(root, route, path){
    if (!root) return null;
    if (!route) return null;
    var nodes = route.components;
    var itemsPath = "";
    for (var i = 0; i < nodes.length; i++){
        if (nodes[i].length == 0) continue;
        if (nodes[i][0] == "."){
            itemsPath += nodes[i];
        }
        else{
            itemsPath += "/" + nodes[i];
        }
        var inner = root[nodes[i]];
        if (!inner){
            inner = root[nodes[i]] = {  };
            inner.$path = itemsPath;
        }
        if (path) path.push(inner);
        root = inner;
    }
    return root;
};

Channel.prototype._removeHandler = function(root, handler){
    if (!root) return null;
    if (!root["."]) return false;
    var i = 0;
    if (handler){
        var handlers = root["."];
        while (i < handlers.length){
            if (typeof handler == "function"){
                if (handlers[i] == handler){
                    handlers.splice(i, 1);
                    continue;
                }
            }
            if (typeof handler == "string"){
                if (handlers[i].id == handler){
                    handlers.splice(i, 1);
                    continue;
                }
            }
            i++;
        }
    }
    else{
        root["."] = [];
    }
    return true;
};


Channel.prototype._removeRoute = function(root, nodes){
    if (!root) return null;
    if (!nodes) return null;
    if (nodes.length == 0){
        return true;
    }
    for (var i = 0; i < nodes.length; i++){
        var inner = root[nodes[i]];
        if (inner) {
            if (this._removeRoute(inner, nodes.slice(0, i).concat(nodes.slice(i+1)), args)){
                delete root[nodes[i]];
            }
        }
    }
    return false;
};

Channel.prototype._sendMessage = function(root, route, nodeIndex, args){
    if (!root) return null;
    if (!route) return null;
    var counter = 0;
    if (nodeIndex < route.nodes.length){
        var node = route.nodes[nodeIndex];
        counter += this._sendInternal(root[node.type],  nodeIndex, route, node.tags, args);
        counter += this._sendInternal(root["*"],  nodeIndex, route, node.tags, args);
    }
    return counter;
};

Channel.prototype._sendInternal = function(root, nodeIndex, route, tags, args){
    if (!root) return null;
    if (!tags) return null;
    if (route.source.start("$/")){
        var param = { source: route.source.substring(2), path : root.$path, current : route.toString(nodeIndex + 1), timestamp: (new Date()).valueOf(), id : route.id };
    }
    else{
        var param = { source: route.source, path : root.$path, current : route.toString(nodeIndex + 1), timestamp: (new Date()).valueOf(), id : route.id };
    }
    //console.log(param);
    var counter = this._callHandlers(root["."], route, param, args);
    if (counter > 0){
        //console.log(root.$path.warn);
    }
    else{
        //console.log(root.$path);
    }
    for (var i = 0; i < tags.length; i++){
        if (tags[i] == "") continue;
        var inner = root["." + tags[i]];
        if (inner) {
            counter += this._sendInternal(inner, nodeIndex, route, tags.slice(0, i).concat(tags.slice(i+1)), args);
        }
    }
    counter += this._sendMessage(root, route, nodeIndex + 1, args);
    return counter;
};

Channel.prototype._callHandlers = function(handlers, route, param, args){
    var counter = 0;
    if (handlers){
        var i = 0;
        while (i < handlers.length){
            if (handlers[i] != null){
                counter++;
                this._callHandlerAsync(route, handlers[i], param, args);
                if (handlers[i].callMode && handlers[i].callMode == "single"){
                    handlers[i] = null;
                    handlers.splice(i, 1);
                }
                else{
                    i++;
                }
            }
        }
    }
    return counter;
}

Channel.prototype._callHandlerAsync = function(route, callback, param, args){
    var channel = this;
    var param1 = args[1];
    var param2 = args[2];
    var param3 = args[3];
    var param4 = args[4];
    var param5 = args[5];
    function callCallback(){
        if (channel == global.Channels){
            var result = callback.call(route, param, param1, param2, param3, param4, param5);
        }
        else{
            var result = callback.call(channel, param, param1, param2, param3, param4, param5);
        }
        route._addResult(result);
    }
    if (route.callplan){
        route.callplan.push(function(){
            setTimeout(callCallback, 1);
        });
    }
    else{
        setTimeout(callCallback, 2);
    }
}


global.Channels = new Channel("/");


module.exports = global.Channels;
