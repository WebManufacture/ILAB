Selector = function (str) {
    this.source = "";
    if (str && typeof str == "string") {
        var item;
        //while (str.indexOf('') > 0)
        if (str.start("/") || str.start(">")) {
            this.isRoot = true;
            this.source = str;
            str = str.substr(1);
        }
        var regex = new RegExp(Selector._regex, "ig");
        while ((item = regex.exec(str)) != null) {
            if (item[1] == "") {
                this._add(item[2], item[3]);
            } else {
                if (item[1] == " " || (item[1] == ">" && item[2] == ">") || (item[1] == "/" && item[2] == "/")) {
                    this._follow(new Selector(str.substr(item.index + 1)));
                    break;
                } else {
                    if (item[1] == "/" || item[1] == ">") {
                        this._next(new Selector(str.substr(item.index + 1)));
                        break;
                    }
                }
            }
        }
    }
}


Selector._regex = "([/>\\s]?)([#.:@]?)([\\w\\*='\"-]+)";

Selector._conditions = /([*=><+&|^!-]+)/;

Selector.prototype = {
    _identify : function(symbol, entity){
        if (!entity) return;
        if (symbol == "" && !this.item){
            this.type = entity;
        }
        if (symbol == "#" && !this.id){
            this.id = entity;
        }
        if (symbol == ":"){
            if (!this.meta) this.meta = {};
            this.meta[entity] = true;
        }
        if (symbol == "@") {
            if (!this.conditions) this.conditions = [];
            var keyValue = entity.split(Selector._conditions);
            var name = keyValue[0];
            var operator = keyValue[1];
            var value = keyValue[2];
            this.conditions.push({name: name, value: value, condition: operator})
        }
        if (symbol == "."){
            if (!this.classes) this.classes = [];
            var tags = '';
            if (this.classes.length == 0){
                this.classes = [ entity ];
                this.tags = " " + entity + " ";
            }
            else{
                if (!this.tags.contains(" " + entity + " ")){
                    this.tags = '';
                    for (var i = 0; i < this.classes.length; i++){
                        if (entity && this.classes[i] > entity){
                            this.classes.splice(i, 0, entity);
                            entity = null;
                            break;
                        }
                    }
                    if (entity){
                        this.classes.push(entity);
                    }
                    for (var i = 0; i < this.classes.length; i++){
                        this.tags += " " + this.classes[i];
                    }
                    this.tags += " ";
                }
            }
        }
    },

    is : function(obj){
        var path = ' ';
        if (this.id && obj.id != this.id) return false;
        var objType = typeof obj;
        if (objType == "object"){
            objType = Array.isArray(obj)? "array" :
                (obj ?
                    (obj.type ? obj.type : (obj.classType ?
                        (obj.classType == "Object" ? (obj.constructor ? obj.constructor.name : "object") : obj.classType)
                        : "object")) : "undefined");
        }
        if (objType == "function"){
            if (this.type != "function"){
                objType = obj.name;
            }
        }
        if (this.type && this.type != "*" && this.type != objType) return false;
        if (this.type && this.type != "*") path += objType;
        if (this.id) path += "#" +this.id;
        if (this.classes){
            if (obj.tags){
                var tags = " " + obj.tags + " ";
                for (var i = 0; i < this.classes.length; i++){
                    var cls = this.classes[i];
                    if (!tags.contains(" " + cls +  " ")){ return false; }
                    path += "." + cls;
                }
            }
            else{
                if (this.classes.length > 0) return false;
                path += "." + this.classes.join(".");
            }
        }
        if (this.meta){
            for (var item in this.meta){
                if (!obj.meta[item]){ return false; }
                path += ":" + item;
            }
        }
        if (this.conditions)
            for (var i = 0; i < this.conditions.length; i++){
                var c = this.conditions[i];
                if (!obj.hasOwnProperty(c.name)) return false;
                path += "@" + c.name;
                if (c.condition){
                    var val = obj[c.name];
                    if (c.condition == ">" && c.value < val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if (c.condition == "<" && c.value > val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if (c.condition == "<=" && c.value >= val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if (c.condition == ">=" && c.value >= val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if (c.condition == "!=" && c.value == val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if ((c.condition == "=" || c.condition == "==") && c.value != val) return false;	// Fenrir 210215 / c.val ----> c.value
                    if (c.condition == "*" && !c.value.contains(val)) return false; // Fenrir 210215 / c.val ----> c.value
                    path += c.condition + c.value;
                }
            }
        return path;
    },

    add: function () {

    },

    has: function () {


    },

    set: function () {


    },

    del: function () {


    },

    get: function () {


    },

    all: function () {


    },

    _add: function (symbol, entityName) {
        if (typeof symbol != "string") return;
        if (!entityName && symbol.length >= 1) {
            entityName = symbol.substr(1);
        }
        this.source += symbol + entityName;
        this._identify(symbol, entityName);
    },

    _next: function (selector) {
        this.next = selector;
        return selector;
    },

    _follow: function (selector) {
        this.follow = selector;
        return selector;
    }
}

Selector.Parse = function (txt) {
    if (typeof txt == "string") {
        var items = Selector.ParseText(txt);
        if (items && items.length) {
            if (items.length == 1) {
                return items[0];
            } else {
                return items;
            }
        }
        return null;
    }
    return txt;
}

Selector.ParseText = function (txt) {
    if (txt) {
        var item;
        var items = [];
        var lines = txt.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var parts = lines[i].split(',');
            for (var j = 0; j < parts.length; j++) {
                items.push(new Selector(parts[j]));
            }
        }
    }
}

Selector.merge = function () {
    var selectors = [];
    for (var i = 0; i < arguments.length; i++) {
        if (Array.isArray(arguments[i])) {
            selectors = selectors.concat(arguments[i]);
        } else {
            selectors.push(arguments[i]);
        }
    }
    var internalProps = Selector.InternalProperties;
    var finalSelector = {
        classes: [],
        next: null,
        follow: null
    };

    for (var i = 0; i < selectors.length; i++) {
        if (!finalSelector.id && selectors[i].id) finalSelector.id = selectors[i].id;
        if (selectors[i].id && selectors.id != finalSelector.id) {
            delete finalSelector.id;
            break;
        }
    }
    for (var i = 0; i < selectors.length; i++) {
        if (!finalSelector.type && selectors[i].type) finalSelector.type = selectors[i].type;
        if (selectors[i].type && selectors.type != finalSelector.type) {
            delete finalSelector.type;
            break;
        }
    }
    for (var i = 0; i < selectors.length; i++) {
        if (selectors[i].classes) {
            for (var k = 0; k < selectors[i].classes.length; k++) {
                var tag = selectors[i].classes[k];
                if (!finalSelector.classes.find(c => c == tag)) {
                    finalSelector.classes.push(tag);
                }
            }
        }
    }
    //if (!data.next) data.next = selector.next;
    //if (!data.follow) data.follow = selector.follow;
    return finalSelector;
};

Selector.InternalProperties = "_intID,_parentID,childs,follow,next,id,type,tags,classes";

Selector._rootNode = new Selector("root");

Selector._rootNode.isRoot = true;

Selector.first = Selector.single = function (txt) {
    if (txt) {
        return new Selector(txt);
    }
}

module.exports = Selector;
