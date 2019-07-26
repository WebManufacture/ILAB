var fs = require('fs');
var Path = require('path');
var util = require('util');
var EventEmitter = require("events").EventEmitter;
var Selector = useModule("Selectors.js");
var utils = useModule("utils.js");

//Структура, Обходчик, Контекст

StorageLayer = function(objects){
    if (!objects) objects = [];
    this.objects = objects;
    this.indexes = {};
    this.internals = {};
    this.types = {

    };
    this.classes = {

    };
    if (objects){
        this._fillIndexes(this.objects);
    }
}

StorageLayer.prototype = {
    _fillIndexes: function(data){
        if (!data) return;
        for(var i = 0; i < data.length; i++){
            var obj = data[i];
            if (obj.id){
                if (this.indexes[obj.id]){
                    if (!this.indexes[obj.id].length){
                        this.indexes[obj.id] = [this.indexes[obj.id]]
                    }
                    this.indexes[obj.id].push(obj);
                }
                else{
                    this.indexes[obj.id] = obj;
                }
            }
            if (obj._intID){
                this.internals[obj._intID] = obj;
            }
            var type = obj.type;
            if (type){
                if (!this.types[type]) this.types[type] = [];
                this.types[type].push(obj);
            }
            if (data[i].tags){
                var classes = data[i].tags.split(' ');
                for(var cl = 0; cl < classes.length; cl++){
                    if (classes[cl]){
                        if (!this.classes[classes[cl]]){
                            this.classes[classes[cl]] = [];
                        }
                        this.classes[classes[cl]].push(data[i]);
                    }
                }
            }
        }
    },

    _filterByClasses: function(selector, items){
        if (!items) return [];
        if (!selector.tags) return [].concat(items);
        var arr = [];
        for (var i = 0; i < items.length; i++){
            if (selector.is(items[i])) arr.push(items[i]);
        }
        return arr;
    },

    _filterByParameters: function(selector, items){ // Fenrir 21022015 / Фильтр по параметрам
        var arr = [];
        for (var i = 0; i < items.length; i++){
            if (selector.is(items[i])) arr.push(items[i]);
        }
        return arr;
    }, // Fenrir 21022015 /

    _getByClasses: function(selector, items){
        if (!items || !selector) return null;
        for (var i = 0; i < items.length; i++){
            if (selector.is(items[i])) return items[i];
        }
        return null;
    },


    _queryInternal: function(selector, item){
        if (!selector) return null;
        if (selector.id){
            var candidate = this.indexes[selector.id];
            if (candidate && candidate.length){
                candidate = candidate[0];
            }
            if (!candidate || !selector.is(candidate)) return null;
            return candidate;
        }
        var candidates = this.objects;
        if (selector.type){
            if (selector.type != "*"){
                var candidates = this.types[selector.type];
                if (!candidates) return null;
            }
        }
        return this._getByClasses(selector, candidates);
    },


    _queryAllInternal: function(selector){
        if (!selector) return;
        if (selector.id){
            var candidate = this.indexes[selector.id];
            if (candidate && candidate.length){
                var newCandidates = [];
                for (var i = 0; i < candidate.length; i++){
                    if (selector.is(candidate[i])){
                        newCandidates.push(candidate[i]);
                    };
                }
                return newCandidates;
            }
            if (!candidate || !selector.is(candidate)) return [];
            return [candidate];
        }
        if (selector.type && selector.type != "*"){
            var candidates = this.types[selector.type];
        }
        else{
            var candidates = this.objects;
        }
        //return this._filterByClasses(selector, candidates); // Fenrir 21022015
        candidates = this._filterByClasses(selector, candidates);
        candidates = this._filterByParameters(selector, candidates);
        return candidates; // Fenrir 21022015 /
    },

    all : function(selector, callback){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        return this._queryAllInternal(selector);
    },

    get : function(selector){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        return this._queryInternal(selector);
    },

    resolveExternalLinks : function(resolver){
        if (typeof resolver == "function"){
            for (var cl = 0; cl < this.objects.length; cl++){
                var obj = this.objects[cl];

            }
        }
    },

    add : function(obj){
        if (obj){
            if (obj.id){
                if (this.indexes[obj.id]){
                    if (!this.indexes[obj.id].length){
                        this.indexes[obj.id] = [this.indexes[obj.id]]
                    }
                    this.indexes[obj.id].push(obj);
                }
                else{
                    this.indexes[obj.id] = obj;
                }
            }
            if (obj.type){
                if (!this.types[obj.type]) this.types[obj.type] = [];
                this.types[obj.type].push(obj);
            }
            if (obj.classes){
                for (var cl = 0; cl < obj.classes.length; cl++){
                    var tag = obj.classes[cl];
                    if (!this.classes[tag]) this.classes[tag] = [];
                    this.classes[tag].push(obj);
                }
            }
            if (obj._intID){
                this.internals[obj._intID] = obj;
            }
            this.objects.push(obj);
            return obj;
        }
        return null;
    },

    del : function(obj){
        if (obj){
            var result = false;
            for (var i = 0; i < this.objects.length; i++){
                if (this.objects[i] == obj){
                    this.objects.splice(i, 1);
                    result = true;
                    break;
                };
            }
            if (result){
                if (obj.id && this.indexes[obj.id]){
                    delete this.indexes[obj.id];
                }
                if (obj.type && this.types[obj.type]){
                    var items = this.types[obj.type];
                    for (var i = 0; i < items.length; i++){
                        if (items[i] == obj){
                            items.splice(i, 1);
                            break;
                        };
                    }
                }
                if (obj.classes){
                    for (var cl = 0; cl < obj.classes.length; cl++){
                        var tag = obj.classes[cl];
                        var items = this.classes[tag];
                        for (var i = 0; i < items.length; i++){
                            if (items[i] == obj){
                                items.splice(i, 1);
                                break;
                            };
                        }
                    }
                }
            }
            return result;
        }
        return false;
    }
};

Storage = function(file, createIfNotExists, watch){
    if (file) file = Path.resolve(file);
    var stor = this;
    this.Init = function(){
        if (!stor.closed){
            stor.layers = [];
        }
        stor.prototypes = {};
        stor.defaultType = null;
        stor.defaultProto = null;
    }

    function Watch(){
        if (!stor.watching && watch){
            this.watcher = fs.watch(file, {}, function(event, fname){
                console.log("Reloading storage: " + fname + " " + event);
                if (!stor.selfChange && !stor.closed && !stor.reloading){
                    //stor.Reload();
                }
            });
            stor.watching = true;
        }
    }

    this.Reload = function(create){
        if (!stor.closed && !stor.reloading && !stor.selfChange){
            stor.Init();
            if (stor.file){
                var exists = fs.existsSync(stor.file);
                if (exists || create){
                    stor.reloading = true;
                    if (exists){
                        fs.readFile(stor.file, function(err, data){
                            var objects = JSON.parse(data);
                            if (!objects){
                                console.warn("Loading storage " + stor.file + " EMPTY!")
                            }
                            else{
                                console.log("Loading storage " + stor.file + " " + objects.length + " items")
                            }
                            stor._loadStore(objects);
                            stor.emit("store-loaded");
                            Watch();
                            stor.reloading = false;
                        });
                    }
                    else{
                        stor.emit("store-loaded");
                        stor.reloading = false;
                        if (create) { stor._save(); };
                        Watch();
                    }
                }
                else{
                    console.error("Deleted " + stor.file);
                    stor._close();
                }
            }
        }
    }
    stor.file = file;
    this.Reload(createIfNotExists);
}

Storage.Delete = function(storage){
    if (!storage.closed){
        storage._close();
    }
    if (storage.file && fs.existsSync(storage.file)){
        fs.unlinkSync(storage.file);
    }
}

Inherit(Storage, EventEmitter, {
    _close : function(){
        this.objects = null;
        this.indexes = null;
        this.items = null;
        this.classes = null;
        if (this.watcher){
            this.watcher.close();
        }
        this.closed = true;
    },

    _loadStore : function(objects){
        this.layers = [new StorageLayer()];
        if (objects){
            for (var i = 0; i < objects.length; i++){
                this._addToLayer(0, this._getObject(objects[i]));
            }
        }
    },

    LoadData : function(objects){
        if (util.isArray(objects)){
            return this._loadStore;
        }
        return this._loadStore([objects]);
    },

    _save : function(){
        if (this.file && !this.closed){
            var stor = this;
            if (stor.reloading){
                setTimeout(function(){
                    stor._save();
                }, 200);
                return;
            }
            this.selfChange = true;
            var objects = [];
            if (this.layers.length > 0){
                objects = this.layers[0].objects;
            }
            fs.writeFileSync(this.file, JSON.stringify(objects));
            this.selfChange = false;
        }
    },

    _initObject : function(obj, selector)
    {
        if (selector){
            this._formatObject(selector, obj);
        }
        if (obj.type){
            var proto = this.prototypes[obj.type];
            if (!proto) proto = this.defaultProto;
            if (proto) obj.prototype = proto;
        }
        else{
            if (this.defaultProto) obj.prototype = this.defaultProto;
        }
    },

    _initObjects : function(objects)
    {
        if (!util.isArray(objects._childs)){
            for (var selector in objects._childs){
                var obj = objects._childs[selector];
                this._initObject(obj, selector);
                if (obj._childs){
                    this._initObjects(obj._childs);
                }
            }
        }
        else{
            for (var i = 0; i < objects.length; i++){
                this._initObject(objects[i]);
                if (objects[i]._childs){
                    this._initObjects(objects[i]._childs);
                }
            }
        }
    },


    _hasParentInLayer : function(layerNum, obj, parentID){
        if (!obj) return null;
        if (obj.__layer <= layerNum){
            return obj._intID == parentID;
        }
        var layer = this.layers[obj.__layer - 1];
        if (!layer) return null;
        var parentObj = layer.internals[obj._parentID];
        return this._hasParentInLayer(layerNum, parentObj, parentID);
    },

    _getFromLayer : function(layerNum, selector, parentID){
        if (!this.layers[layerNum]) return null;
        if (!selector) return null;
        var items = this.layers[layerNum].all(selector);
        if (!items || !items.length){
            if (!parentID && !selector.isRoot){
                return this._getFromLayer(layerNum+1, selector);
            }
            else{
                return null;
            }
        }
        else{
            if (!parentID && !selector.isRoot){
                var items2 = this._getFromLayer(layerNum+1, selector);
            }
        }
        if (parentID){
            for (var i = 0; i < items.length; i++){
                var item = items[i];
                if (item._parentID != parentID){
                    items.splice(i,1);
                    i--;
                }
            }
        }
        if (!items.length) return null;
        if (selector.next){
            var result = [];
            if (items2 && items2.length){
                result = result.concat(items2);
            }
            for (var i = 0; i < items.length; i++){
                var fItems = this._getFromLayer(layerNum + 1, selector.next,items[i]._intID);
                if (fItems){
                    result = result.concat(fItems);
                }
            }
            return result;
        }
        if (selector.follow){
            var result = [];
            if (items2 && items2.length){
                result = result.concat(items2);
            }
            for (var i = 0; i < items.length; i++){
                var fItems = this._getFromLayer(layerNum + 1, selector.follow);
                if (fItems){
                    for (var ff = 0; ff < fItems.length; ff++){
                        if (!this._hasParentInLayer(layerNum, fItems[ff], items[i]._intID)){
                            fItems.splice(ff, 1);
                            ff--;
                        };
                    }
                    result = result.concat(fItems);
                }
            }
            return result;
        }
        if (items2 && items2.length){
            items = items.concat(items2);
        }
        return items
    },


    _getObjects : function(data){
        if (!data) return null;
        if (!data.length) return [];
        for (var i = 0; i < data.length; i++){
            data[i] = this._getObject(data[i]);
        }
        return data;
    },

    _getObject : function(data){
        if (data){
            if (typeof(data) == 'string')
                data = new Selector(data);
            else{
                data.__proto__ = {
                    _intID: 0,
                    _parentID: 0,
                    __layer: 0,
                };
                data.__proto__.__proto__ = StorageObjectPrototype;
                if (data.childs) data.childs = this._getObjects(data.childs);
                if (data.next) data.next = this._getObjects(data.next);
                if (data.follow) data.follow = this._getObjects(data.follow);
            }
        }
        return data;
    },


    _getId : function(){
        return ("" + Math.random()).replace("0.", "") + ("" + Math.random()).replace("0.", "");
    },

    _addToLayer : function(layerNum, data, parentId){
        if (!data) return null;
        if (!this.layers[layerNum]) this.layers[layerNum] = new StorageLayer();
        if (!data._intID) data.__proto__._intID = this._getId();
        if (parentId && !data._parentID) data.__proto__._parentID = parentId;
        if (!data.__layer) data.__proto__.__layer = layerNum;
        if (this.layers[layerNum].internals[data._intID]) return null;

        this.layers[layerNum].add(data);
        if (data.childs){
            for (var i = 0; i < data.childs.length; i++){
                this._addToLayer(layerNum + 1, data.childs[i], data._intID);
            }
        }
        if (data.next){
            this._addToLayer(layerNum + 1, data.next, data._intID);
        }
        if (data.follow){
            this._addToLayer(layerNum + 1, data.follow, data._intID);
        }
        return data;
    },


    _formatObject : function(selector, data){
        var internalProps = Selector.InternalProperties;

        if (!selector){
            return this._getObject(data);
        }
        if (!data){
            return this._getObject(selector);
        }
        selector = this._getObject(selector);
        data = this._getObject(data);
        if (selector.id && !data.id){
            data.id = selector.id;
        }
        if (data.classes){
            for (var i = 0; i < data.classes.length; i++){
                if (!data.tags) data.tags = " ";
                var cls = data.classes[i];
                if (!data.tags.contains(" " + cls + " ")){
                    data.tags += cls + " ";
                }
            }
        }
        if (selector.tags && !selector.classes){
            selector.classes = selector.tags.trim().split(" ");
        }
        if (selector.classes){
            for (var i = 0; i < selector.classes.length; i++){
                if (!data.tags) data.tags = " ";
                var cls = selector.classes[i];
                if (!data.tags.contains(" " + cls + " ")){
                    data.tags += cls + " ";
                }
            }
        }
        if (data.tags){
            data.classes = data.tags.trim().split(" ");
        }
        if (selector.type && !data.type){
            data.type = selector.type;
        }
        if (selector.childs){
            if (!data.childs) data.childs = [];
            data.childs = data.childs.concat(this._getObjects(selector.childs));
        }
        if (!data.next) data.next = selector.next;
        if (!data.follow) data.follow = selector.follow;

        for (var item in selector){
            if (typeof data[item] == "undefined" && !internalProps.contains(item)){
                data[item] = selector[item];
            }
        }
        return data;
    },

    _addToSelector: function(selector, data){
        var items = this._getFromLayer(0, selector);
        data = JSON.stringify(data);
        items.forEach((item) => {
            var obj = this._getObject(JSON.parse(data));
            if (!item.childs) item.childs = [];
            item.childs.push(obj);
            this._addToLayer(item.__layer + 1, obj, item._intID);
        });
    },

    getByKey : function(key){
        for (var i = 0; i < this.layers.length; i++){
            if (this.layers.internals[key]){
                return this.layers.internals[key];
            }
        }
        return null;
    },

    all : function(selector, data){
        if (this.layers.length == 0) return [];
        var items = null;
        var me = this;
        if (typeof(data) == 'function'){
            var callback = data;
            setImmediate(function(){
                callback.call(me, items ? items : []);
            });
            data = null;
        }
        selector = this._formatObject(selector, data);
        if (!selector) selector = "*";
        var layerNum = 0;
        items = this._getFromLayer(layerNum, selector);
        return items ? items : [];
    },

    get : function(selector, data){
        var items = null;
        var me = this;
        if (typeof(data) == 'function'){
            var callback = data;
            setImmediate(function(){
                callback.call(me, (items && items.length > 0) ? items[0] : null);
            });
            data = null;
        }
        if (this.layers.length > 0) {
            selector = this._formatObject(selector, data);
            if (!selector) selector = "*";
            var layerNum = 0;
            items = this._getFromLayer(layerNum, selector);
        }
        return (items && items.length > 0) ? items[0] : null;
    },

    set : function(selector, data){
        if (!data) data = selector;
        data = this._formatObject(selector, data);
        if (data.id){
            if (this.indexes[data.id]){
                var obj = this.indexes[data.id];
                for (var item in data){
                    obj[item] = data[item];
                }
            }
        }
        else{

        }
        this._save();
        return null;
    },

    add : function(selector, data){
        if (!selector && !data) return;
        if (this.layers.length == 0) this.layers.push(new StorageLayer());
        var items = null;
        var me = this;
        if (typeof(data) == 'function'){
            var callback = data;
            setImmediate(function(){
                callback.call(me, data);
            });
            data = null;
        }
        if (typeof data == "string") {
            data = this._formatObject(data);
            this._addToSelector(selector, data);
        } else {
            if (data) {
                data = this._formatObject(null, data);
                this._addToSelector(selector, data);
            } else {
                data = this._formatObject(selector);
                this._addToLayer(0, data);
            }
        }
        //if (data._intID) data._intID = this._getId();
        this._save();
        return data;
    },

    del : function(selector, data){
        selector = this._formatObject(selector, data);
        if (!selector) return;
        var count = 0;
        var me = this;
        if (typeof(data) == 'function'){
            var callback = data;
            setImmediate(function(){
                callback.call(me, count);
            });
            data = null;
        }
        for (var i = this.layers.length-1; i >= 0; i--){
            var all = this.layers[i].all(selector);
            for (var oi = all.length-1; oi >= 0; oi--){
                if (this.layers[i].del(all[oi])){
                    count++;
                }
            }
        }
        this._save();
        return count;
    }
});

StorageObjectPrototype = {
    is: Selector.prototype.is,
    toString: function () {
        return this._intID + "";
    }
}

module.exports = Storage;
