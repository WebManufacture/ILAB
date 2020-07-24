StorageLayer = function(objects){
    if (!objects) objects = [];
    this.objects = objects;
    this.indexes = {};
    this.parentByIndex = [];
    this.objectsByParent = {};
    this.types = {

    };
}

StorageLayer.prototype = {
    _getCandidate: function(selector, indexes, parents){
        if (!indexes || !indexes.length) return null;
        for (var i = 0; i < indexes.length; i++){
            var obj = this.objects[indexes[i]];
            var parentIndex = this.parentByIndex[indexes[i]];
            if (selector.is(obj) &&
                (!parents || parents.indexOf(parentIndex) >= 0))
                return indexes[i];
        }
        return null;
    },

    _getSelectorIntersections : function(selector){
        var candidates = null;
        if (selector.id){
            var indexes = this.indexes[selector.id];
            if (!indexes) return null;
            candidates = [].concat(indexes);
        }
        if (selector.type && selector.type != "*"){
            var indexes = this.types[selector.type];
            if (!indexes) return null;
            if (!candidates) candidates = [].concat(indexes);
            else candidates = Array.intersect(candidates, indexes);
        }
        return candidates;
    },

    _queryInternal: function(selector, parents){
        if (!selector) return null;
        var candidates = this._getSelectorIntersections(selector);
        if (candidates) return this._getCandidate(selector, candidates, parents);
        if (parents){
            for (var i = 0; i < this.parentByIndex.length; i++){
                if (parents.indexOf(this.parentByIndex[i]) >= 0){
                    var obj = this.objects[i];
                    if (selector.is(obj)) return i;
                }
            }
            return null;
        }
        else{
            for (var i = 0; i < this.objects.length; i++){
                if (selector.is(this.objects[i])) return i;
            }
        }
        return null;
    },

    getIndexesByParents : function(parents){
        if (parents && parents.length){
            return this.parentByIndex.mapNew(function(value, index){
                return parents.indexOf(value) >= 0 ? index : undefined;
            }, this).sort();
        }
    },

    getParentIndex : function(index){
        return this.parentByIndex[index];
    },

    getByIndex : function(index){
        return this.objects[index];
    },

    getIndex : function(selector, parentIndex){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        return this._queryInternal(selector, parentIndex);
    },

    get : function(selector, parentIndex){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        var index = this._queryInternal(selector, parentIndex);
        return typeof index == "number" ? this.objects[index] : null;
    },

    _filterByOther: function(selector, indexes, parents){
        if (!indexes || !indexes.length) return [];
        return indexes.filter(function(index){
            var obj = this.objects[index];
            var parentIndex = this.parentByIndex[index];
            return selector.is(obj) &&
                (!parents || parents.indexOf(parentIndex) >= 0);
        }, this);
    },

    _queryAllInternal: function(selector, parents){
        if (!selector) return;
        var candidates = this._getSelectorIntersections(selector);
        if (candidates) return this._filterByOther(selector, candidates, parents);
        var arr = [];
        //parentByIndex по длинне всегда соответсвует objects
        return this.parentByIndex.mapNew(function(parentIndex, i){
            if (parents && parents.indexOf(parentIndex) < 0) return;
            var obj = this.objects[i];
            if (selector.is(obj)) return i;
        }, this);
    },

    all : function(selector, parents){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        return this.allByIndexes(this._queryAllInternal(selector, parents));
    },

    allIndexes : function(selector, parents){
        if (typeof(selector) == 'string') selector = new Selector(selector);
        return this._queryAllInternal(selector, parents);
    },

    allByIndexes : function(indexes){
        return indexes.map(function(i){return this.objects[i]}, this);
    },

    add : function(obj, parentIndex){
        if (obj){
            this.objects.push(obj);
            if (typeof parentIndex != "number") parentIndex = null;
            this.parentByIndex.push(parentIndex);
            var index = this.objects.length - 1;
            if (obj.id){
                if (this.indexes[obj.id]){
                    if (!this.indexes[obj.id].length){
                        this.indexes[obj.id] = [this.indexes[obj.id]]
                    }
                    this.indexes[obj.id].push(index);
                }
                else{
                    this.indexes[obj.id] = index;
                }
            }
            if (obj.type){
                if (!this.types[obj.type]) this.types[obj.type] = [];
                this.types[obj.type].push(index);
            }
            return index;
        }
    },

    _delObject : function(index){
        var obj = this.objects[index];
        if (obj){
            var parentId = this.parentByIndex[index];
            if (typeof parentId == "number"){
                this.parentByIndex.splice(index, 1);
            }
            this.objects.splice(index, 1);
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
            return index;
        }
    },

    delByParent : function(parentIndex){
        var found = [];
        if (typeof parentIndex == "number"){
            for (var i = 0; i < this.parentByIndex.length; i++){
                if (this.parentByIndex[i] == parentIndex){
                    found.push(this._delObject(i));
                };
            }
        }
        return found;
    },

    del : function(obj){
        if (obj){
            for (var i = 0; i < this.objects.length; i++){
                if (this.objects[i] == obj){
                    return this._delObject(i);
                };
            }
        }
    }
};


Storage = function(){
    var stor = this;
    this.layers = [];
}

Inherit(Storage, EventEmitter, {
    _loadStore : function(objects){
        var result = [];
        if (objects){
            for (var i = 0; i < objects.length; i++){
                result.push(this._addToLayer(0, objects[i]));
            }
        }
        return result;
    },

    LoadData : function(objects){
        this.layers = [new StorageLayer()];
        if (Array.isArray(objects)){
            return this._loadStore(objects);
        }
        return this._loadStore([objects]);
    },

    _searchDeep : function(context, layerNum, selector, parents, parentLayer){
        if (layerNum >= this.layers.length) return null;
        var indexes = this._searchInLayer(context, layerNum, selector, parents);
        parents = this.layers[layerNum].getIndexesByParents(parents);
        return this._searchDeep(context, layerNum + 1, selector, parents, layerNum);
    },

    _searchInLayer : function(context, layerNum, selector, parents){
        if (!this.layers[layerNum]) return null;
        var layer = this.layers[layerNum];
        var indexes = layer.allIndexes(selector, parents);
        if (!indexes || indexes.length == 0) return null;
        context.unique(layer.allByIndexes(indexes));
        context.searchResult.push({ layer : layerNum, indexes : indexes });
        if (selector.next){
            return this._searchInLayer(context, layerNum + 1, selector.next, indexes);
        }
        if (selector.follow){
            return this._searchDeep(context, layerNum + 1, selector.follow, indexes, layerNum);
        }
        return indexes;
    },

    all : function(selector){
        if (!this.layers.length) return [];
        if (!selector) return this.all("*");
        if (typeof selector == "string"){
            selector = new Selector(selector);
        }
        var context = new Storage.SearchContext(this);
        if (selector.isRoot) {
            this._searchInLayer(context, 0, selector);
        }
        else{
            this._searchDeep(context, 0, selector)
        }
        return context;
    },

    _getDeep : function(layerNum, selector, parents, parentLayer){
        if (layerNum >= this.layers.length) return null;
        var result = this._getFromLayer(layerNum, selector, parents);
        if (result) return result;
        var layer = this.layers[layerNum];
        return this._getDeep(layerNum + 1, selector, layer.getIndexesByParents(parents), layerNum);
    },

    _getFromLayer : function(layerNum, selector, parents){
        if (!this.layers[layerNum]) return null;
        var index = this.layers[layerNum].getIndex(selector, parents);
        if (index == null) return null;
        if (selector.next){
            return this._getFromLayer(layerNum + 1, selector.next, [index]);
        }
        if (selector.follow){
            return this._getDeep(layerNum + 1, selector.follow, [index], layerNum);
        }
        return { layer : layerNum, index: index, item : this.layers[layerNum].getByIndex(index) };
    },

    get : function(selector){
        if (!selector) return this.get("*");
        if (!this.layers.length) return null;
        if (typeof selector == "string"){
            selector = new Selector(selector);
        }
        var result = null;
        if (selector.isRoot) {
            result = this._getFromLayer(0, selector);
        }
        else{
            result = this._getDeep(0, selector)
        }
        return result ? result.item : null;
    },

    _addToLayer : function(layerNum, data, parentIndex){
        if (!data) return null;
        if (this.defaultType && !data.type){
            data.type = this.defaultType;
        }
        var layer = this.layers[layerNum];
        if (!layer) layer = this.layers[layerNum] = new StorageLayer();
        var index = layer.add(data, parentIndex);
        if (data.childs){
            for (var i = 0; i < data.childs.length; i++){
                this._addToLayer(layerNum + 1, data.childs[i], index);
            }
        }
        if (data.next){
            this._addToLayer(layerNum + 1, data.next, index);
        }
        if (data.follow){
            this._addToLayer(layerNum + 1, data.follow, index);
        }
        return data;
    },


    add : function(data, obj){
        if (!data) return;
        if (this.layers.length == 0) {
            this.layers.push(new StorageLayer());
        }
        if (typeof data == "string"){
            var selector = new Selector(data);
            if (obj){
                var items = this.all(selector);
                return items.add(obj);
            }
            var defaultObj = {};
            data = selector.copyTo(defaultObj);
        }
        if (typeof data == "object"){
            if (Array.isArray(data)){
                return this._loadStore(data);
            }
            return this._addToLayer(0, data);
        }
        return null;
    },

    _delFromLayer : function(layer, data){
        if (this.layers[layer]){
            return this.layers[layer].del(data);
        }
        return null;
    },

    del : function(data){
        if (!data) return null;
        var count = 0;
        var me = this;
        if (typeof data == "string"){
            var items = this.all(data);
            if (items && items.length > 0){
                for (var i = items.length-1; i >= 0; i--){
                    if (this._delFromLayer(items[i].__layer, items[i])) count++;
                }
            }
        }
        if (typeof data == "object"){
            for (var i = this.layers.length-1; i >= 0; i--){
                if (this.layers[layer].del(data)) count++;
            }
        }
        return count > 0 ? data : null;
    }
});

Storage.SearchContext = function(storage){
    var context = new Array(); //context = [];
    context._storage = storage;
    context.searchResult = [];
    for (var prop in Storage.SearchContextPrototype){
        context[prop] = Storage.SearchContextPrototype[prop];
    }
    return context;
}

Storage.SearchContextPrototype = {
    add : function(data){
        if (!data) return;
        if (typeof data == "string"){
            var selector = new Selector(data);
            var defaultObj = {};
            data = selector.copyTo(defaultObj);
        }
        if (typeof data == "object"){
            if (Array.isArray(data)){
                return this._loadStore(data);
            }
            var storage = this._storage;
            this.searchResult.each(function(sr){
                var layer = storage.layers[sr.layer];
                if (!layer) return;
                sr.indexes.each(function(index){
                    var obj = layer.getByIndex(index);
                    if (!obj.childs) obj.childs = [];
                    obj.childs.push(data);
                    storage._addToLayer(sr.layer + 1, data, index);
                });
            });
            return data;
        }
        return null;
    },

    all : function(selector){
        if (!selector) return this.all("*");
        if (typeof selector == "string"){
            selector = new Selector(selector);
        }
        var stor = this._storage;
        var context = new Storage.SearchContext(stor);
        var selectorFunc = null;
        if (selector.isRoot) {
            selectorFunc = stor._searchInLayer;
        }
        else{
            selectorFunc = stor._searchDeep;
        }
        this.searchResult.each(function(sr){
            selectorFunc.call(stor, context, sr.layer + 1, selector, sr.indexes, sr.layer);
        });
        return context;
    },

    get : function(selector){
        if (!selector) {
            if (this.length) return this[0];
            return null;
        }
        if (typeof selector == "string"){
            selector = new Selector(selector);
        }
        var selectorFunc = null;
        var stor = this._storage;
        if (selector.isRoot) {
            selectorFunc = stor._getFromLayer;
        }
        else{
            selectorFunc = stor._getDeep;
        }

        var sr = this.searchResult;
        for (var i = 0; i < sr.length; i++){
            var res = selectorFunc.call(stor, sr[i].layer + 1, selector, sr[i].indexes)
            if (res) return res.item;
        }
    },

    del : function(selector){
        var count = 0;
        var me = this;
        if (data){
            return this.all(data).del();
        }
        else{
            var storage = this._storage;
            this.searchResult.each(function(sr){
                var layer = storage.layers[sr.layer];
                if (!layer) return;
                sr.indexes.each(function(index){
                    layer._delObject(index);
                });
            });
        }
        return this._storage;
    }
};

Storage.getObjects = function(data){
    if (!data) return null;
    if (!data.length) return [];
    for (var i = 0; i < data.length; i++){
        data[i] = this._getObject(data[i]);
    }
    return data;
}

Storage.getObject = function(data){
    if (data){
        if (typeof(data) == 'string')
            data = new Selector(data);
        else{
            if (data.childs) data.childs = this._getObjects(data.childs);
            if (data.next) data.next = this._getObjects(data.next);
            if (data.follow) data.follow = this._getObjects(data.follow);
        }
    }
    return data;
}

Storage.merge = function(selector, data, copyProps){
    var internalProps = Selector.InternalProperties;
    if (!selector){
        return Storage.getObject(data);
    }
    if (!data){
        return Storage.getObject(selector);
    }
    selector = Storage.getObject(selector);
    data = Storage.getObject(data)
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
    if (copyProps){
        for (var item in selector){
            if (typeof data[item] == "undefined" && !internalProps.contains(item)){
                data[item] = selector[item];
            }
        }
    }
    return data;
}


Storage.Create = function(data){
    var stor = new Storage();
    if (stor){
        this.LoadData(data);
    }
    return stor;
}
