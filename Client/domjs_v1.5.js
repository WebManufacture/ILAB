if (window && window.Using === undefined) {
    function Check(arg) {
        return arg != undefined && arg != null;
    }

    function check(arg) {
        return arg != undefined && arg != null;
    }

    function CreateClosure(func, thisParam, param1, param2, param3) {
        if (!func) return;
        if (param1) {
            if (param2) {
                if (param3) {
                    return function () {
                        func.call(thisParam, param1, param2, param3);
                    }
                }
                return function () {
                    func.apply(thisParam, param1, param2);
                }
            }
            return function () {
                func.apply(thisParam, param1);
            }
        }
        return function () {
            func.apply(thisParam, arguments);
        }
    }

    Extend = function (objToExtend, obj) {
        for (var item in obj) {
            objToExtend[item] = obj[item];
        }
    }

    EvalInContext = function (code, context) {
        var func = function () {
            return eval(code);
        }
        return func.call(context, context);
    }

    Inherit = function (Child, Parent, mixin) {
        if (typeof(Child) == "string") {
            Child = window[Child] = function () {
            };
        }
        var F = function () {
        };
        F.prototype = Parent.prototype
        var childProto = Child.prototype = new F();
        childProto.constructor = Child;
        if (mixin) {
            for (var item in mixin) {
                childProto[item] = mixin[item];
            }
        }
        var baseConstructor = Parent;
        Child.base = Parent.prototype;
        childProto._base = Parent.prototype;
        childProto._super = Child._super = Child.super_ = function (args) {
            baseConstructor.apply(this, arguments);
        }
        return Child;
    }

    Object.defineProperty(Object.prototype, "classType", {
        enumerable: false,
        get: function () {
            var str = {}.toString.call(this);
            str = str.substr(1, str.length - 2);
            return str.replace("object ", "");
        }
    });

    function gfdp(dp) {
        if (dp < 10) return "0" + dp;
        return dp + "";
    }

    Date.prototype.formatTime = function (withMilliseconds) {
        if (withMilliseconds) {
            return gfdp(this.getHours()) + ":" + gfdp(this.getMinutes()) + ":" + gfdp(this.getSeconds()) + "." + this.getMilliseconds();
        }
        else {
            return gfdp(this.getHours()) + ":" + gfdp(this.getMinutes()) + ":" + gfdp(this.getSeconds());
        }
    };
    Date.prototype.formatDate = function (separator, reverse) {
        var date = this.getDate();
        date = gfdp(date);
        var month = this.getMonth() + 1;
        month = gfdp(month);
        if (!separator) {
            separator = "-"
        }
        if (reverse) {
            return date + separator + month + separator + this.getFullYear();
        }
        else {
            return this.getFullYear() + separator + month + separator + date;
        }
    };
    Date.prototype.formatDateRus = function () {
        return this.formatDate('.', true);
    };
    Date.MonthRusNames = [
        "январь",
        "февраль",
        "март",
        "апрель",
        "май",
        "июнь",
        "июль",
        "авгу��т",
        "сен��ябрь",
        "октябрь",
        "ноябрь",
        "декабрь"
    ];
    Date.prototype.formatRus = function () {
        var date = this.getDate();
        var month = Date.MonthRusNames[this.getMonth()];
        return date + " " + month + " " + this.getFullYear();
    };
    Date.ParseRus = function (value) {
        var dt = value.split(" ");
        var time = null;
        if (dt.length > 1) {
            var time = dt[1].split(":");
        }
        var date = dt[0].split(".");
        if (time) {
            return new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]), parseInt(time[0]), parseInt(time[1]));
        }
        else {
            return new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]));
        }
    };


    Array.intersect = function (arr1, arr2) {
        arr1.sort();
        arr2.sort();
        var res = [];
        var i = arr1.length - 1;
        var j = arr2.length - 1;
        var value = null;
        while (i > 0 || j > 0) {
            if (arr2[j] > arr1[i]) {
                j--;
                continue;
            }
            if (arr1[i] > arr2[j]) {
                i--;
                continue;
            }
            res.push(arr1[i]);
            i--;
            j--;
        }
        if (arr1[0] == arr2[0]) res.push(arr1[0]);
        return res.sort();
    };


    Array.prototype.Contains = Array.prototype.contains = function (value) {
        return this.indexOf(value) >= 0;
    };


    Array.prototype.Each = Array.prototype.each = function (func) {
        for (var i = 0; i < this.length; i++) {
            if (func.call(this[i], this[i]) == false) {
                return;
            }
            ;
        }
    };

    Array.prototype.GetIndex = Array.prototype.getIndex = function (obj) {
        if (typeof(obj) != 'object') return null;
        for (var i = 0; i < this.length; i++) {
            if (typeof(this[i]) != 'object') return;
            var allres = true;
            for (var item in obj) {
                if (this[i][item] == undefined || this[i][item] != obj[item]) {
                    allres = false;
                    break;
                }
            }
            if (allres) return i;
        }
        return null;
    };

    Array.prototype.Get = Array.prototype.get = Array.prototype.search = function (obj) {
        return typeof ind == "number" ? this[ind] : null;
    };

    Array.prototype.Each = Array.prototype.each = function (func, thisArg) {
        if (!thisArg) thisArg = this;
        for (var i = 0; i < this.length; i++) {
            if (func.call(thisArg, this[i], i, this) == false) {
                return;
            }
            ;
        }
    };

    Array.prototype.append = function (arr) {
        if (!Array.isArray(arr)) return null;
        return this.push.apply(this, arr);
    };

    Array.prototype.unique = function (arr) {
        if (!Array.isArray(arr)) return null;
        arr.each(function (elem) {
            if (this.indexOf(elem) < 0) this.push(elem);
        }, this);
    };

    Array.prototype.mapNew = function (callback, thisArg) {
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        var newArr = [];
        for (var i = 0; i < this.length; i++) {
            if (thisArg) {
                var mappedValue = callback.call(thisArg, this[i], i);
            }
            else {
                var mappedValue = callback(this[i], i);
            }
            if (mappedValue != undefined) {
                newArr.push(mappedValue);
            }
            ;
        }
        return newArr;
    };

    String.prototype.Contains = function (str) {
        var type = typeof(str);
        if (type == "string") {
            return this.indexOf(str) >= 0;
        }
        if (str.length != undefined) {
            for (var i = 0; i < str.length; i++) {
                if (this.indexOf(str[i]) >= 0) return true;
            }
        }
        return false;
    };
    String.prototype.endsWith = String.prototype.end = String.prototype.ends = function (str) {
        return this.lastIndexOf(str) == this.length - str.length;
    };

    function StringSelector() {
        return DOM(this);
    };
//String.prototype.__defineGetter__("sel", StringSelector);
    String.prototype.contains = String.prototype.has = function (substr) {
        return this.indexOf(substr) > -1;
    };
    String.prototype.start = function (str) {
        return this.indexOf(str) == 0;
    };
    String.prototype.get = function (regex) {
        if (regex instanceof RegExp) {
            var match = regex.exec(this);
            if (match.length > 0) return match[match.length - 1];
            return null;
        }
        return null;
    };

    function AssociatedArray() {
        this.objects = {};
        this.count = 0;
    }

    AssociatedArray.prototype = {
        add: function (name, elem) {
            if (this.objects == undefined || this.objects == null) {
                this.objects = {};
            }
            var obj = this.objects[name];
            if (obj == undefined || obj == null) {
                this.count++;
            }
            if (elem == undefined || elem == null) {
                this.count--;
            }
            this.objects[name] = elem;
            return this.count;
        },
        get: function (name) {
            var obj = this.objects[name];
            if (obj != undefined && obj != null) {
                return obj;
            }
            return null;
        },
        remove: function (name) {
            var obj = this.objects[name];
            if (obj != undefined && obj != null) {
                this.objects[name] = null;
                this.objects[name] = undefined;
                this.count--;
            }
            return this.count;
        }
    };

    function AArray() {
        var arr = [];
        arr.uadd = function (name) {
            if (this.contains(name)) return null;
            this.push(name);
            return this.length;
        };
        arr.contains = function (name) {
            return this.indexOf(name) >= 0;
        };
        arr.add = function (name, elem) {
            if (this.objects == undefined || this.objects == null) {
                this.objects = {};
            }
            var obj = this.objects[name];
            if (obj == undefined || obj == null) {
                this.push(name);
                this.objects[name] = elem;
            }
            if (elem == undefined || elem == null) {
                this.del(name);
            }
            return this.length;
        };
        arr.get = function (name) {
            if (this.objects == undefined || this.objects == null) {
                this.objects = {};
            }
            var obj = this.objects[name];
            if (obj != undefined && obj != null) {
                return obj;
            }
            return null;
        };
        arr.del = function (name) {
            if (this.objects == undefined || this.objects == null) {
                return this.length;
            }
            var obj = this.objects[name];
            if (obj != undefined && obj != null) {
                this.objects[name] = undefined;
                this.remove(name);
            }
            return this.length;
        };
        arr.insert = function (index, name, elem) {
            if (this.objects == undefined || this.objects == null) {
                return this.length;
            }
            if (index == 0 && this.length == 0) {
                this.add(name, elem);
            }
            if (index >= 0 && index < this.length) {
                this.objects[name] = elem;
                var other = this.slice(index);
                this[index] = name;
                index++;
                for (var i = 0; i < other.length; i++) {
                    this[index + i] = other[i];
                }
            }
            return this.length;
        };
        return arr;
    }

    Using = using = function (name) {
        var obj = window[name.toLowerCase()];
        if (obj) {
            if (window.debug && window.L) L.Warn("Reinitializing " + name + "!");
            return true;
        }
        else {
            SetAllCaseProperty(window, {}, name);
            return false;
        }
    };
    UsingDOM = usingDOM = function (name, sname) {
        var lname = name.toLowerCase();
        var obj = document.querySelector("." + lname + ".provider");
        if (obj) {
            if (check(sname)) {
                SetAllCaseProperty(window, obj, sname);
            }
            else {
                SetAllCaseProperty(window, obj, name);
            }
            if (window.debug && window.L) {
                if (L) L.Warn("Reinitializing " + name + "!");
            }
            return true;
        }
        else {
            obj = document.createElement("div");
            obj.className += lname + " provider system-object invisible";
            document.documentElement.appendChild(obj);
            if (check(sname)) {
                SetAllCaseProperty(window, obj, sname);
            }
            else {
                SetAllCaseProperty(window, obj, name);
            }
            if (window.L) {
                L.LogObject(obj);
            }
            return false;
        }
    };
    SetAllCaseProperty = function (obj, value, name) {
        var lname = name.toLowerCase();
        var hname = name.toUpperCase();
        obj[lname] = value;
        obj[hname] = value;
        obj[name] = value;
    }
    Exists = exists = function (name) {
        var lname = name.toLowerCase();
        var obj = DOM.get("." + lname + ".provider");
        if (obj) {
            if (window[lname] != obj) {
                SetAllCaseProperty(window, obj, name);
            }
            return true;
        }
        throw name + " not exists in modules!";
        return false;
    };
    var Base64 = {
        // private property
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        // public method for encoding
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output +
                    Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) +
                    Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);
            }
            return output;
        },
        // public method for decoding
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
            while (i < input.length) {
                enc1 = Base64._keyStr.indexOf(input.charAt(i++));
                enc2 = Base64._keyStr.indexOf(input.charAt(i++));
                enc3 = Base64._keyStr.indexOf(input.charAt(i++));
                enc4 = Base64._keyStr.indexOf(input.charAt(i++));
                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;
                output = output + String.fromCharCode(chr1);
                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            }
            return output;
        }
    }

    // UTF-8 encode / decode by Johan Sundstr?m
    function encode_utf8(s) {
        return unescape(encodeURIComponent(s));
    }

    function decode_utf8(s) {
        return decodeURIComponent(escape(s));
    }

    function sha1(str) { // Calculate the sha1 hash of a string
        //
        // + original by: Webtoolkit.info (http://www.webtoolkit.info/)
        // + namespaced by: Michael White (http://crestidg.com)
        var rotate_left = function (n, s) {
            var t4 = (n << s) | (n >>> (32 - s));
            return t4;
        };
        var lsb_hex = function (val) {
            var str = "";
            var i;
            var vh;
            var vl;
            for (i = 0; i <= 6; i += 2) {
                vh = (val >>> (i * 4 + 4)) & 0x0f;
                vl = (val >>> (i * 4)) & 0x0f;
                str += vh.toString(16) + vl.toString(16);
            }
            return str;
        };
        var cvt_hex = function (val) {
            var str = "";
            var i;
            var v;
            for (i = 7; i >= 0; i--) {
                v = (val >>> (i * 4)) & 0x0f;
                str += v.toString(16);
            }
            return str;
        };
        var blockstart;
        var i, j;
        var W = new Array(80);
        var H0 = 0x67452301;
        var H1 = 0xEFCDAB89;
        var H2 = 0x98BADCFE;
        var H3 = 0x10325476;
        var H4 = 0xC3D2E1F0;
        var A, B, C, D, E;
        var temp;
        str = encode_utf8(str);
        var str_len = str.length;
        var word_array = new Array();
        for (i = 0; i < str_len - 3; i += 4) {
            j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 |
                str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
            word_array.push(j);
        }
        switch (str_len % 4) {
            case 0:
                i = 0x080000000;
                break;
            case 1:
                i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
                break;
            case 2:
                i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
                break;
            case 3:
                i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) << 8 | 0x80;
                break;
        }
        word_array.push(i);
        while ((word_array.length % 16) != 14) word_array.push(0);
        word_array.push(str_len >>> 29);
        word_array.push((str_len << 3) & 0x0ffffffff);
        for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
            for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
            for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;
            for (i = 0; i <= 19; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }
            for (i = 20; i <= 39; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }
            for (i = 40; i <= 59; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }
            for (i = 60; i <= 79; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }
            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;
        }
        var temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
        return temp.toLowerCase();
    }

    function dec2hex(d) {
        return d.toString(16);
    }

    function hex2dec(h) {
        return parseInt(h, 16);
    }

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
                }
                else {
                    if (item[1] == " ") {
                        this._follow(new Selector(str.substr(item.index + 1)));
                        break;
                    }
                    if (item[1] == "/" || item[1] == ">") {
                        this._next(new Selector(str.substr(item.index + 1)));
                        break;
                    }
                }
            }
        }
    }


    Selector._regex = "([/>\\s]?)([#.:@]?)([\\w\\*='\"-]+)";

    Selector.prototype = {
        _identify: function (symbol, entity) {
            if (!entity) return;
            if (symbol == "" && !this.item) {
                this.type = entity;
            }
            if (symbol == "#" && !this.id) {
                this.id = entity;
            }
            if (symbol == ":") {
                if (!this.meta) this.meta = {};
                this.meta[entity] = true;
            }
            if (symbol == "@") {
                var keyValue = entity.split("=");
                this[keyValue[0]] = keyValue.length > 1 ? keyValue[1] : null;
            }
            if (symbol == ".") {
                if (!this.classes) this.classes = [];
                var tags = '';
                if (this.classes.length == 0) {
                    this.classes = [entity];
                    this.tags = " " + entity + " ";
                }
                else {
                    if (!this.tags.contains(" " + entity + " ")) {
                        this.tags = '';
                        for (var i = 0; i < this.classes.length; i++) {
                            if (entity && this.classes[i] > entity) {
                                this.classes.splice(i, 0, entity);
                                entity = null;
                                break;
                            }
                        }
                        if (entity) {
                            this.classes.push(entity);
                        }
                        for (var i = 0; i < this.classes.length; i++) {
                            this.tags += " " + this.classes[i];
                        }
                        this.tags += " ";
                    }
                }
            }
        },

        is: function (selector) {
            if (this.id && selector.id != this.id) return false;
            if (this.type && this.type != "*" && selector.type != this.type) return false;
            if (this.classes) {
                if (selector.tags) {
                    var tags = " " + selector.tags + " ";
                    for (var i = 0; i < this.classes.length; i++) {
                        var cls = this.classes[i];
                        if (!tags.contains(" " + cls + " ")) {
                            return false;
                        }
                    }
                }
                else {
                    if (Array.isArray(selector.classes)) {
                        for (var i = 0; i < this.classes.length; i++) {
                            var cls = this.classes[i];
                            if (selector.classes.indexOf(cls) < 0) {
                                return false;
                            }
                        }
                    }
                    else {
                        if (this.classes.length > 0) return false;
                    }
                }
            }
            if (this.meta) {
                for (var item in this.meta) {
                    if (!selector.meta[item]) {
                        return false;
                    }
                }
            }
            /*for (var item in this){
			if (!Selector.InternalProperties.contains(item)){
				if (selector[item] != this[item]){ return false; }
			}
		}*/
            return true;
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
        },

        copyTo: function (obj) {
            var props = Selector.InternalProperties.split(",");
            for (var i = 0; i < props.length; i++) {
                if (props) {
                    if (obj[props[i]] === undefined && this[props[i]] !== undefined) {
                        obj[props[i]] = this[props[i]]
                    }
                }
            }
            return obj;
        }
    }

    Selector.Parse = function (txt) {
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
            return items;
        }
    }

    Selector.InternalProperties = "_intID,_parentID,childs,follow,next,id,type,tags,classes";

    Selector._rootNode = new Selector("root");

    Selector._rootNode.isRoot = true;

    Selector.first = Selector.single = function (txt) {
        if (txt) {
            return new Selector(txt);
        }
    }

    if (typeof(setImmediate) != "function") {
        function setImmediate(callback) {
            setTimeout(callback, 1);
        }
    }

    Async = {
        Sync: function () {
            this.counter = 0;
            this.methods = 0;
        },

        Waterfall: function (callback) {
            this.counter = 0;
            this.handlers = [];
            this._doneMethod = callback;
        },


        Collector: function (immediatly) {
            var count = 0;
            if (typeof (count) == 'boolean') {
                this.immediatly = count;
                if (typeof (immediatly) == 'number') count = immediatly;
            }
            else {
                if (typeof (immediatly) == 'boolean') {
                    this.immediatly = immediatly;
                }
            }
            this.methods = [];
            if (count > 0) {
                this.handlers = new Array(count);
                this.results = new Array(count);
                this.count = count;
            }
            else {
                this.handlers = [];
                this.results = [];
                this.count = 0;
            }
        },
    };

    Async.Sync.prototype = {
        callThere: function (callback) {
            callback.ready = true;
            this.handlers.push(callback);
            return callback;
        },

        check: function () {
            var syncProto = this;
            var i = this.handlers.length;
            var func = function () {
                syncProto.handlers[i] = {};
                syncProto.handlers[i].ready = true;
                syncProto._checkHandlers();
            }
            func.ready = false;
            this.handlers[i] = func;
            return func;
        },

        add: function (callback) {
            var self = this;
            var i = this.handlers.length;
            var func = function () {
                if (callback) {
                    callback();
                }
                self.handlers[i] = "done";
                self._checkHandlers();
            };
            this.handlers.push(func);
            return func;
        },

        _checkHandlers: function () {
            var handlersReady = true;
            for (var j = 0; j < this.handlers.length; j++) {
                handlersReady = handlersReady && (this.handlers[j].ready);
            }
            if (handlersReady) {
                for (var j = 0; j < this.handlers.length; j++) {
                    var hCall = this.handlers[j];
                    if (typeof(hCall) == 'function') {
                        hCall.apply(hCall.thisParam, hCall.args);
                    }
                }
            }
        }
    };

    Async.Collector.prototype = {
        add: function (callback) {
            var cb = this.getResultCallback();
            var func = function () {
                callback(cb);
            };
            this.methods.push(func);
            if (this.immediatly) setImmediate(func);
            return func;
        },

        createParametrizedCallback: function (param, thisParam, callback) {
            if (typeof (thisParam) == 'function') {
                callback = thisParam;
                thisParam = this;
            }
            if (!thisParam) thisParam = this;
            var cb = this.getResultCallback();
            if (!param) param = cb;
            var func = function () {
                callback.call(thisParam, param, cb);
            };
            this.methods.push(func);
            if (this.immediatly) setImmediate(func);
            return func;
        },

        run: function (callback) {
            for (var i = 0; i < this.methods.length; i++) {
                setImmediate(this.methods[i]);
            }
            this.emit('start');
        },

        getResultCallback: function () {
            var syncProto = this;
            this.count++;
            var i = this.count - 1;
            var func = function (result) {
                syncProto.handlers[i] = true;
                syncProto.results[i] = result;
                syncProto.emit('handler', result, i);
                syncProto._checkDone();
            };
            return func;
        },

        _checkDone: function () {
            var handlersReady = true;
            for (var j = 0; j < this.count; j++) {
                handlersReady = handlersReady && this.handlers[j];
            }
            if (handlersReady) {
                this.done();
            }
        },

        done: function () {
            this.emit('done', this.results);
        }
    };

    Async.Waterfall.prototype = {
        addClosure: function () {
            return this.add(CreateClosure.apply(this, arguments));
        },

        add: function (callback) {
            var self = this;
            var func = function () {
                if (callback) {
                    callback.apply(self, arguments);
                }
                self.counter--;
                self._checkDone();
            };
            this.counter++;
            return func;
        },

        _checkDone: function () {
            if (this.counter == 0 && typeof(this._doneMethod) == 'function') {
                var self = this;
                setTimeout(function () {
                    self._doneMethod();
                }, 1);
            }
        },
    };

    function IsEmpty(elem) {
        if (elem == undefined || elem == null || elem.length == 0) return true;
        if (elem instanceof HTMLElement) {
            return elem.innerHTML == "";
        }
        return true;
    }

    if (window.check == undefined) {
        window.check = function (param) {
            return param != undefined && param != null
        }
    }

    if ((window.WS == undefined || window.WS == null) && (window.DOM == undefined || window.DOM == null || window.DOM.JaspVersion < 3.15)) {

        WS = {};

        DOM = dom = function (path) {
            return document.querySelector(path);
        };

        DOM._onload = DOM.OnLoad = DOM.onLoad = function (handler) {
            WS.DOMload(handler);
        };

        DOM._on = DOM.On = DOM.on = function (event, handler, bubble) {
            if (event == "load" && this == DOM) {
                WS.DOMload(handler);
            }
            this.addEventListener(event, handler, bubble)
        };

        DOM.JaspVersion = DOM.version = 1.41;

        DOM.Div = DOM.div = DOM._div = function (classes, value) {
            var div = document.createElement("div");
            if (classes) {
                div._add(classes);
            }
            if (value) {
                div._set(value);
            }
            var result = WS.CallEvent(this, "onAddElem", div);
            if (this != DOM && result) {
                this.appendChild(div);
            }
            return div;
        };

        DOM.Tag = DOM.tag = DOM._tag = function (tagName, classes, value) {
            var div = document.createElement(tagName);
            if (classes) {
                div._add(classes);
            }
            if (value) {
                div._set(value);
            }
            var result = WS.CallEvent(this, "onAddElem", div);
            if (this != DOM && result) {
                this.appendChild(div);
            }
            return div;
        };

        DOM.Func = DOM.func = DOM._func = DOM.each = DOM._each = function (path, callback) {
            var elems = this._all(path);
            for (var i = 0; i < elems.length; i++) {
                var node = elems[i];
                var res = callback.call(this, node);
            }
        };


        DOM.Aggregate = function (func) {
            var arr = [];
            this.each(function () {
                var res = func.call(arr, this);
                if (res) {
                    arr.push(res);
                }
                ;
            });
            return arr;
        };

        DOM.Get = DOM.get = DOM._get = DOM.first = function (path) {
            if (path && path.length > 0 && path.start) {
                if (path.start("@")) {
                    path = path.substr(1, path.length - 1);
                    var attr = this.attributes.getNamedItem(path);
                    if (attr == null) return null;
                    return attr.value;
                }
                if (path.start(">")) {
                    path = path.substr(1, path.length - 1);
                    for (var i = 0; i < this.childNodes.length; i++) {
                        var node = this.childNodes[i];
                        if (node && node.nodeType == 1 && node._is(path))
                            return node;
                    }
                    return null;
                }
                if (path[0] == "^") {
                    path = path.substr(1, path.length - 1);
                    var parent = this.parentNode;
                    while (parent != null && parent._is) {
                        if (parent._is(path)) return parent;
                        parent = parent.parentNode;
                    }
                    return null;
                }
            }
            else {
                if (this == DOM) {
                    return document.documentElement.innerHTML;
                }
                else {
                    return this.innerHTML;
                }
            }
            if (this == DOM) {
                return document.querySelector(path);
            }
            else {
                return this.querySelector(path);
            }
        };
        /*
	DOM.last = function(path) {
		if (this == DOM) {
			var items = document.querySelectorAll(path);
		}
		else {
			var items = this.querySelectorAll(path);
		}
		if (items && items.length > 0){
			return items[items.length-1];
		}
		return null;
	};
	*/

        DOM.Set = DOM.set = DOM._set = function (path, value) {
            if (!check(path)) {
                if (WS.CallEvent(this, "onSetContent", value)) {
                    this.innerHTML = value;
                }
                return this.firstChild;
            }
            if (path instanceof HTMLElement) {
                if (WS.CallEvent(this, "onDelContent", path)) {
                    this.innerHTML = "";
                    this._add(path, value);
                }
                return path;
            }
            if (typeof path == 'string') {
                if (path.start('.')) {
                    return WS.SetAttribute(this, 'class', path.replace(/\./g, ' '));
                }
                if (path.start('@')) {
                    return WS.SetAttribute(this, path, value);
                }
                if (path.start('#')) {
                    path = path.substr(1);
                    if (this == DOM) {
                        WS.Body.id = path;
                        return WS.Body;
                    }
                    else {
                        this.id = path;
                        return this;
                    }

                }
            }
            if (!check(value)) {
                if (WS.CallEvent(this, "onSetContent", path)) {
                    this.innerHTML = path;
                }
                ;
                return this.firstChild;
            }
            return this.firstChild;
        };

        DOM.Clone = DOM.clone = DOM._clone = function () {
            var temp = DOM.Div();
            if (this.outerHTML != undefined) {
                temp.innerHTML = this.outerHTML;
            }
            else {
                var serializer = new XMLSerializer();
                var serialized = serializer.serializeToString(this);
                serialized = serialized.replace('xmlns="http://www.w3.org/1999/xhtml"', "");
                temp.innerHTML = serialized;
            }
            if (temp.firstChild) {
                temp.firstChild._del(".prototype");
                if (typeof(this.onclone) == "function") this.onclone(temp.firstChild);
            }
            if (window.Contexts) {
                Contexts.Process(temp, "ui-clone", this);
            }
            return temp.firstChild;
        };

        DOM.Has = DOM.has = DOM._has = function (path) {
            if (typeof (path) == "string") {
                if (path.start("@")) {
                    path = path.substr(1, path.length - 1);
                    var attr = this.attributes.getNamedItem(path);
                    return attr != null && attr.value != "";
                }
                if (this == DOM) {
                    return document.querySelector(path) != null;
                }
                else {
                    return this.querySelector(path) != null;
                }
            }
            if (path instanceof HTMLElement) {
                return path.parentNode == this;
            }
            return false;
        };

        DOM.Is = DOM.is = DOM._is = function (selector) {
            if (this == DOM) {
                return document.documentElement.Is(selector);
            }
            else {
                //Mozilla
                if (this.mozMatchesSelector) {
                    return this.mozMatchesSelector(selector);
                }
                //Webkit
                if (this.webkitMatchesSelector) {
                    return this.webkitMatchesSelector(selector);
                }
                //IE
                if (this.msMatchesSelector) {
                    return this.msMatchesSelector(selector);
                }
                //Opera
                if (this.oMatchesSelector) {
                    return this.oMatchesSelector(selector);
                }
                //W3 Standart & И для каких-то странных браузеров, которые осмелились реализовать стандарт ))))
                if (this.matchesSelector) {
                    return this.matchesSelector(selector);
                }
                //No match support
                var nodeList = node.parentNode.querySelectorAll(selector);
                for (var i = 0; i < nodeList.length; i++) {
                    if (nodeList[i] == node) {
                        return true;
                    }
                }
                return false;
            }
        };

        DOM.All = DOM.all = DOM._all = function (path) {
            var array = [];
            if (!path) return null;
            if (path[0] == "^") {
                path = path.substr(1, path.length - 1);
                var parent = this.parentNode;
                var parents = [];
                while (parent != null && parent._is) {
                    if (parent._is(path)) parents.push(parent);
                    parent = parent.parentNode;
                }
                return WS.WrapArray(parents);
            }
            if (path.start(">")) {
                path = path.substr(1, path.length - 1);
                var elem = this;
                if (this == DOM) {
                    elem = document.documentElement;
                }
                for (var i = 0; i < elem.childNodes.length; i++) {
                    var node = elem.childNodes[i];
                    if (node && node.nodeType == 1 && (path == "" || node._is(path)))
                        array.push(node);
                }
            }
            else {
                if (this == DOM) {
                    array = document.querySelectorAll(path);
                }
                else {
                    array = this.querySelectorAll(path);
                }
            }
            return WS.WrapArray(array);
        };

        DOM.Last = DOM.last = DOM._last = function (path) {
            if (this == DOM) {
                var array = document.querySelectorAll(path);
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i].parentNode == document.documentElement) return array[i];
                }
            }
            else {
                var array = this.querySelectorAll(path);
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i].parentNode == this) return array[i];
                }
            }
            return null;
        };

        DOM.Wrap = DOM.wrap = function (html) {
            var wrapper = DOM.div();
            wrapper.innerHTML = html;
            /*if (wrapper.childNodes.length == 1)
return wrapper.firstChild;*/
            return wrapper.childNodes;
        };

        DOM.Ins = DOM.ins = DOM._ins = function (entity, value) {
            if (entity == undefined || entity == null || entity.length == 0) return null;
            if (!check(this.firstChild)) return this._add(entity, value);
            if (entity.length || entity.IsElementArray) {
                for (var j = 0; j < entity.length; j++) {
                    var last = this._Ins(entity[j]);
                }
                return last;
            }
            if (entity instanceof HTMLElement) {
                if (WS.CallEvent(this, "onAddElem", entity)) {
                    this.insertBefore(entity, this.firstChild);
                }
                return entity;
            }
            if ((entity) instanceof Object) {
                var div = WS.ToDiv(entity, value);
                if (WS.CallEvent(this, "onAddElem", div)) {
                    this.insertBefore(div, this.firstChild);
                }
            }
            return this;
        };

        DOM.Add = DOM.add = DOM._add = function (entity, value, param) {
            var elem = this;
            if (elem == DOM) elem = WS.Body; //document.documentElement;
            if (entity == undefined || entity == null || entity.length == 0) {
                if (value) {
                    if (WS.CallEvent(elem, "onAddElem", value)) {
                        elem.innerHTML += value;
                        return elem.lastChild;
                    }
                }
                return null;
            }
            ;
            if (typeof (entity) == "string") {
                if (entity.start('.')) {
                    return WS.SetClass(elem, entity);
                }
                if (entity.start('@')) {
                    return WS.AddAttribute(elem, entity, value);
                }
                if (entity.start('#')) {
                    entity = entity.substr(1);
                    elem.id = entity;
                    return elem;
                }
                if (entity.start('$')) {
                    entity = entity.substr(1);
                    var span = document.createElement("span");
                    span.innerHTML = entity;
                    return elem._add(span);
                }
                if (entity.start('!')) {
                    entity = entity.substr(1);
                    return elem._on(entity, value, param);
                }
                if (WS.CallEvent(elem, "onAddElem", entity)) {
                    elem.innerHTML += entity;
                }
                return elem.lastChild;
            }
            if (entity instanceof Node) {
                if (WS.CallEvent(elem, "onAddElem", entity)) {
                    elem.appendChild(entity);
                }
                return entity;
            }
            if (entity.length || entity.IsElementArray) {
                for (var j = 0; j < entity.length; j++) {
                    var last = elem._Add(entity[j]);
                }
                return last;
            }
            if ((entity) instanceof Object) {
                var div = WS.ToDiv(entity, value);
                if (WS.CallEvent(elem, "onAddElem", div)) {
                    elem.appendChild(div);
                    return div;
                }
            }
            return elem;
        };


        DOM.Del = DOM.del = DOM._del = function (entity) {
            var elem = this;
            if (this == DOM) {
                elem = document.documentElement;
            }
            if (entity == undefined || entity == null || entity.length == 0) {
                if (WS.CallEvent(elem, "onDelElem")) {
                    elem.parentNode.removeChild(elem);
                    return null;
                }
                return elem;
            }
            if (typeof (entity) == "string" && entity.start('.')) {
                return WS.ResetClass(elem, entity);
            }
            if (typeof (entity) == "string" && entity.start('@')) {
                return WS.DelAttribute(elem, entity);
            }
            if (typeof (entity) == "string") {
                return elem._all(entity)._del();
            }
            return this;
        };

        BOM = {};

        /* Для совместимости со старым DOM */

        BOM.AGet = BOM.aget = BOM._AGet = BOM._aget = function (path, value, selector) {
            if (selector == undefined || selector == null) {
                selector = "";
            }
            if (this == BOM) {
                return WS.Body._get(selector + "[" + path + "='" + value + "']");
            }
            return this._get(selector + "[" + path + "='" + value + "']");
        };

        DOM.aget = function (path, value, selector) {
            if (selector == undefined || selector == null) {
                selector = "";
            }
            if (this == DOM) {
                return DOM._get(selector + "[" + path + "='" + value + "']");
            }
            return this._get(selector + "[" + path + "='" + value + "']");
        };

        BOM.Attr = BOM.attr = BOM._Attr = BOM._attr = function (attr, value) {
            if (value != undefined) {
                return this._set("@" + attr, value);
            }
            if (this == BOM) {
                return WS.Body._get("@" + attr);
            }
            return this._get("@" + attr);
        };

        BOM.ratt = function (attr) {
            this.removeAttribute(attr);
        };


        BOM.Cls = BOM.cls = BOM._Cls = BOM._cls = BOM.addc = BOM.adc = function (cls) {
            cls = cls.replace(/ /g, ".");
            cls = "." + cls;
            return this._add(cls);
        };

        BOM.Rcs = BOM.rcs = BOM._Rcs = BOM._rcs = BOM.delc = BOM.dlc = function (cls) {
            cls = cls.replace(" ", ".");
            cls = "." + cls;
            return this._del(cls);
        };


        BOM.html = BOM._html = function (html) {
            var owner = this;
            if (owner == DOM) owner = WS.Body;
            owner.innerHTML = html;
        };

        BOM.text = BOM._text = function (html) {
            var owner = this;
            if (owner == DOM) owner = WS.Body;
            owner.textContent = html;
        };


        // Конец совместимости

        BOM.GetOrDiv = function (selector) {
            if (this == BOM) {
                var elem = WS.Body._get(selector);
            }
            else {
                var elem = this._get(selector);
            }
            if (!elem) {
                elem = this._div(selector);
            }
            return elem;
        }

        BOM.Show = BOM.show = function (toggle) {
            if (toggle) {
                if (this.is(".invisible")) {
                    this._Del(".invisible");
                }
                else {
                    this._Add(".invisible");
                }
                return;
            }
            this._Del(".invisible");
        };

        BOM.Hide = BOM.hide = function (element) {
            this._Add(".invisible");
        };


        BOM.Clear = BOM.empty = BOM.Empty = BOM.clear = function (element) {
            this.innerHTML = "";
        };

        BOM.SetCoord = BOM.setCoord = function (x, y) {
            this.style.top = y + "px";
            this.style.left = x + "px";
        };

        BOM.ToString = BOM.toString = function (withBody) {
            if (this == DOM) return "DOM " + DOM.vesion;
            var result = "<" + this.tagName.toLowerCase();
            if (this.attr("id") != null) {
                result += "#" + this.attr("id");
            }
            var cls = this.attr("class");
            if (cls) {
                result += "." + cls.replace(/ /g, ".");
            }
            if (withBody) {

            }
            var url = this.attr("url");
            if (url) {
                result += "@url='" + url + "'";
            }
            result += ">";
            return result;
        };

        BOM.ToObj = BOM.toObj = function () {
            var res = {};
            for (var i = 0; i < this.attributes.length; i++) {
                var attr = this.attributes[i];
                res[attr.name] = attr.value;
            }
            return res;
        };

        BOM.BubbleEvent = function (eventName, eventObj, conditions) {
            if (this.parentNode && this.parentNode.BubbleEvent) {
                if (this.parentNode._eventCheck && this.parentNode._eventCheck(eventName, eventObj, conditions) != false) {
                    this.parentNode.BubbleEvent(eventName, eventObj, conditions);
                }
            }
        };

        BOM._eventCheck = function (eventName, eventObj, conditions) {
            var event = this[eventName];
            if (event && typeof(event.fire) == "function") {
                if (conditions) {
                    return event.fire(conditions, eventObj);
                }
                else {
                    return event.fire(eventObj);
                }
            }
            return true;
        };

        BOM.AttrProperty = function (name) {
            var obj = this;
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.attr(name);
                }
                , set: function (newValue) {
                    obj.attr(name, newValue);
                }
            });
        };

        BOM.AttrClassProperty = function (name) {
            var obj = this;
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.attr(name);
                }
                , set: function (newValue) {
                    var value = obj.attr(name);
                    if (value) {
                        obj.rcs(value);
                    }
                    if (newValue) {
                        obj.attr(name, newValue);
                        obj.cls(newValue);
                    }
                }
            });
        };

        BOM.InnerProperty = function (name, selector) {
            var obj = this;
            if (!selector) selector = "." + name;
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.Get(selector).innerHTML;
                }
                , set: function (newValue) {
                    obj.Get(selector).innerHTML = newValue;
                }
            });
        };

        BOM.ValueProperty = function (name, selector) {
            var obj = this;
            if (!selector) selector = "." + name;
            obj.get(selector).onchange = function () {
                if (this.update) {
                    //this.update();
                }
            };
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.Get(selector).value;
                }
                , set: function (newValue) {
                    var inp = obj.Get(selector);
                    inp.value = newValue;
                    if (inp.update) {
                        inp.update();
                    }
                }
            });
        };

        BOM.AttrValueProperty = function (name, selector) {
            var obj = this;
            if (!selector) selector = "." + name;
            /*obj.get(selector).onchange = function(){
obj.attr(name, this.value);
if (this.update){
//this.update();
}
};*/
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.Get(selector).value;
                }
                , set: function (newValue) {
                    if (newValue) {
                        obj.attr(name, newValue);
                    }
                    var inp = obj.Get(selector);
                    inp.value = newValue;
                    if (inp.update) {
                        inp.update();
                    }
                }
            });
        };

        BOM.AttrInnerProperty = function (name, selector) {
            var obj = this;
            if (!selector) selector = "." + name;
            obj.attr(name, "");
            Object.defineProperty(obj, name, {
                get: function () {
                    return obj.Get(selector).innerHTML;//obj.attr(name);
                }
                , set: function (newValue) {
                    if (newValue) {
                        obj.attr(name, newValue);
                    }
                    obj.Get(selector).innerHTML = newValue;
                }
            });
        };

        BOM.FillObj = function (obj) {
            for (key in obj) {
                obj[key] = this.get('@' + key);
            }
            ;
            return obj;
        };

        BOM.On = function (event, callback) {
            if (typeof (event) == "string") {
                if (event.start('.')) {
                    event = event.substr(1);
                    this.onAddClass = function (classString) {
                        if (classString == event) {
                            callback.call(this, classString);
                        }
                    };

                    return;
                }
                if (event.start('@')) {
                    event = event.substr(1);
                    this.onSetAttr = function (attr, value) {
                        if (event == attr) {
                            callback.call(this, attr, value);
                        }
                    };

                    return;
                }
                this.onAddElem = function (element) {
                    if (this._is(event)) {
                        callback.call(this, element);
                    }
                };
            }
        };

        BOM.OnClass = function (event, callback) {
            if (typeof (event) == "string") {
                if (event.start('.')) {
                    event = event.substr(1);
                }
                this.onAddClass = function (classString) {
                    if (classString == event) {
                        callback.call(this, classString);
                    }
                };
                return;
            }
        };

        BOM.OnElem = function (selector, callback) {
            if (typeof (selector) == "string") {
                this.onAddElem = function (element) {
                    if (this._is(selector)) {
                        callback.call(this, element);
                    }
                };
            }
        };

        BOM.OnAttr = function (event, callback) {
            if (typeof (event) == "string") {
                if (event.start('@')) {
                    event = event.substr(1);
                }
                this.onSetAttr = function (attr, value) {
                    if (event == attr) {
                        callback.call(this, attr, value);
                    }
                };
            }
        };

        WS.DOMload = function (func) {
            /*if (document.body){
func();
return;
}*/
            if (document.addEventListener) {
                document.addEventListener("DOMContentLoaded", func, false);
            }
            else {
                if (window.addEventListener) {
                    window.addEventListener("load", func, false);
                }
                else {
                    if (window.attachEvent) {
                        window.attachEvent("onload", func);
                        return true;
                    }

                    window.onload = func;
                }
            }
        };

        WS.InitW = function () {
            if (navigator.appName != "Microsoft Internet Explorer") {
                WS.ExtendElement(HTMLElement.prototype);
                WS.DOMload(WS.InitDOM);
            }
            else {
                var ver = navigator.appVersion.get(/MSIE (\d+.\d+);/);
                ver = parseFloat(ver);
                if (ver >= 8.0) {
                    WS.ExtendElement(HTMLElement.prototype);
                    /*
__IEcreateElement = document.createElement;
document.createElement = function (tagName) {
var element = __IEcreateElement(tagName);
for (func in DOM){
element["_" + func] = DOM[func];
//element["" + func] = DOM[func];
}
return element;
};*/
                    WS.DOMload(WS.InitDOM);
                }
                else {
                    WS.DOMload(BROWSER_ShowWarning);
                    //WS = null;
                    //DOM = null;
                }

            }
        };

        function SetStyleIE(elem, style) {
            elem.removeAttribute("style");
            elem.setAttribute("style", style);
            elem.style.cssText = style;
        }

        function BROWSER_ShowWarning(event) {
            var lightbox = document.createElement("div");
            document.body.appendChild(lightbox);
            var elem = document.createElement("div");
            lightbox.appendChild(elem);
            SetStyleIE(lightbox, "background-color: black; height: 100%; left: 0; position: absolute; top: 0; width: 100%; z-index: 1000;");
            lightbox.setAttribute("id", "BROWSER_WarningPanel");
            SetStyleIE(elem, "position: absolute; background-color: white; border: 2px solid orange; border-radius: 15px 15px 15px 15px; height: 50%; top: 20%; left: 25%; width: 50%; padding: 20px; font-family: tahoma;");
            var title = elem.appendChild(document.createElement("div"));
            SetStyleIE(title, "color: red; font-size: 30px; text-align: center;");
            title.innerHTML = "Warning!";
            elem.innerHTML += "<br/></br>";
            var text = elem.appendChild(document.createElement("div"));
            SetStyleIE(text, "text-align: justify; font-size: 16px; color: black;");
            text.innerHTML = "Ваш <b>браузер устарел</b>. Он имеет уязвимости в безопасности и может не показывать все возможности на этом и других сайтах. Кроме того, возможны серъезные ошибки в работе сервиса.";
            text.innerHTML += "<br/>Подробнее узнать об обновлении браузера, или установить более современный браузер, вы сможете перейдя по ссылке: </br><a style='color:red; text-decoration: underline;'		href='http://www.browser-update.org/update.html'>http://www.browser-update.org</a>";
            text.innerHTML += "<br/></br>Your browser is <b>out of date</b>. It has known security flaws and may not display all features of this and other websites.";
            text.innerHTML += "</br>To learn more about updating of the browser or upgrade it, you can click here: </br><a style='color:red; text-decoration: underline;' href='http://www.browser-update.org/update.html'>http://www.browser-update.org</a>";

            var btnStyle = "border: solid 1px orange; border-radius: 5px; cursor: pointer; float: right; font-size: 14px; padding: 5px 10px; text-align: center; margin: 10px; color: white;";

            var controls = elem.appendChild(document.createElement("div"));
            SetStyleIE(controls, "left: 20px; position: absolute; bottom: 20px;");
            var btnOk = controls.appendChild(document.createElement("div"));
            SetStyleIE(btnOk, btnStyle + "font-weight: bold; background: green;");
            btnOk.innerHTML = "Update your browser / Обновить браузер";
            btnOk.onclick = function () {
                window.location = "http://www.google.com/chromeframe?quickenable=true";
                this.innerHTML = "Please wait...";
                this.onclick = null;
            };
            var btnCancel = controls.appendChild(document.createElement("div"));
            btnCancel.innerHTML = "I understand the risk / Я понимаю риск";
            SetStyleIE(btnCancel, btnStyle + "font-weight: bold; border: solid 1px red; color: black;");
            btnCancel.panel = lightbox;
            btnCancel.onclick = function () {
                document.body.removeChild(this.panel);
            };
            return false;
        }

        WS.ExtendElement = function (proto) {
            if (window.W) {
                for (var func in DOM) {
                    if (func.indexOf("_") == 0) {
                        continue;
                    }

                    proto["_" + func] = DOM[func];
                }
            } else {
                for (var func in DOM) {
                    if (func.indexOf("_") == 0 || typeof(DOM[func]) != 'function') {
                        continue;
                    }
                    proto["_" + func] = DOM[func];
                    proto[func] = DOM[func];
                }
            }
            for (var func in BOM) {
                proto[func] = BOM[func];
            }
            //Совместимость
            /*
proto.rcs = DOM._rcs;
proto.cls = DOM._cls;
proto.attr = DOM._attr;
proto.html = DOM._html;
proto.aget = DOM._aget;
*/
            //Конец совместимости
            if (proto.__defineGetter__) {
                if (!HTMLElement.outerHTML && window.Node && window.XMLSerializer) {
                    proto.__defineGetter__("outerHTML", WS.GetOuterHTML);
                }
                proto.__defineGetter__("dom", WS.SetOutWrapper);
                proto.__defineSetter__("dom", WS.SetInWrapper);
            }
            return proto;
        };


        WS.InitDOM = function () {
            WS.Body = document.body;
            window.Body = document.body;
            WS.Header = document.head;

            if (window.W) {
                for (var func in DOM) {
                    WS.Header["_" + func] = DOM[func];
                }
            }
            else {
                for (var func in DOM) {
                    WS.Header["_" + func] = DOM[func];
                    WS.Header[func] = DOM[func];
                }
            }

            if (window.ev) {
                /*ev.CreateEvent("onAddElem", WS);
ev.CreateEvent("onDelElem", WS);
ev.CreateEvent("onAddClass", WS);
ev.CreateEvent("onDelClass", WS);
ev.CreateEvent("onSetAttr", WS);
ev.CreateEvent("onDelAttr", WS);
ev.CreateEvent("onSetContent", WS);
ev.CreateEvent("onDelContent", WS);*/
            }
            if (WS.onload) {
                WS.onload();
            }
        };

        WS.JsonToHtml = function (obj, div) {
            if (!div) {
                div = DOM.Div();
            }
            if (Array.isArray(obj)) {
                div._add(".array");
                for (var i = 0; i < obj.length; i++) {
                    div._add(WS.JsonToHtml(obj[i]));
                }
                return div;
            }
            for (var prop in obj) {
                var value = obj[prop];
                if (prop.indexOf(".") == 0) {
                    if (value) {
                        div._add(prop);
                    }
                    continue;
                }
                if (prop.indexOf("@") == 0) {
                    div._set(prop, value);
                    continue;
                }
                if (typeof(value) == "object") {
                    if (value instanceof HTMLElement) {
                        div._add(value);
                    }
                    else {
                        div._add(WS.JsonToHtml(value));
                    }
                }
                else {
                    div[prop] = obj[prop];
                }
            }
            return div;
        }

        WS.ToDiv = function (obj, param1, param2, param3) {
            var div = DOM.Div();
            var isdefault = false;
            for (var prop in obj) {
                if (["default", 'innerHTML', 'innerText', 'innerValue', 'defaultValue'].contains(prop))
                    isdefault = true;
                div[prop] = obj[prop];
                if ((obj[prop]) instanceof Object) {
                    if (isdefault && (obj[prop] instanceof HTMLElement)) {
                        div._add(obj.prop);
                    }
                }
                else {
                    if (isdefault) {
                        div.innerHTML = prop;
                    }
                    else {
                        if (prop.indexOf(".") == 0) {
                            div._add(prop);
                        }
                        else {
                            if (prop.indexOf("@") == 0) {
                                div._set(prop, obj[prop]);
                            }
                            else {
                                WS.AddAttribute(div, prop, obj[prop]);
                            }
                        }
                    }
                }
            }
            for (var i = 1; i < arguments.length; i++) {
                div._add(arguments[i]);
            }
            return div;
        }

        WS.SetOutWrapper = function () {
            return "$";
        };

        WS.SetInWrapper = function (value) {
            if (value.start("$")) {
                this._add(value.substr(1));
            }
            else {
                this._set(value.substr(1));
            }
        };

        WS.ToggleClass = function (elem, clss) {
            if (elem._is("." + clss)) {
                elem.del("." + clss);
                return false;
            }
            else {
                elem.add("." + clss);
                return true;
            }
        }

        WS.GetOuterHTML = function () {
            var serialized = new XMLSerializer().serializeToString(this);
            return serialized.replace('xmlns="http://www.w3.org/1999/xhtml"', "");
        };

        WS.WrapArray = function (array) {
            for (var func in DOM) {
                array[func] = WS.BindFunction(func);
            }
            for (var func in BOM) {
                array[func] = WS.BindFunction(func);
            }
            array.IsElementArray = true;
            array.each = WS.Each;
            array.select = WS.Select;
            if (array.__defineGetter__) {
                array.__defineGetter__("last", WS.GetLastElem);
                array.__defineGetter__("first", WS.GetFirstElem);
            }
            return array;
        };

        WS.GetLastElem = function () {
            if (this.length > 0) {
                return this[this.length - 1];
            }
            return null;
        };

        WS.GetFirstElem = function () {
            if (this.length > 0) {
                return this[0];
            }
            return null;
        };

        WS.Each = function (func) {
            for (var i = 0; i < this.length; i++) {
                func.call(this, this[i]);
            }
        };

        WS.Select = function (func) {
            var arr = [];
            for (var i = 0; i < this.length; i++) {
                var res = func.call(arr, this[i]);
                if (res) {
                    arr.push(res);
                }
                ;
            }
            return arr;
        };

        WS.BindFunction = function (funcName) {
            return function (param1, param2, param3) {
                for (var i = 0; i < this.length; i++) {
                    this[i][funcName](param1, param2, param3);
                }
            };
        };

        WS.CallEvent = function (element, eventName, param1, param2, param3) {
            var result = true;
            if (typeof WS[eventName] == 'function') {
                var res = WS[eventName].call(element, param1, param2, param3);
                if (res != undefined) {
                    result &= res;
                }
            }
            if (typeof element[eventName] == 'function') {
                var res = element[eventName].call(element, param1, param2, param3);
                if (res != undefined) {
                    result &= res;
                }
            }
            return result;
        };

        WS.SetAttribute = function (elem, attrName, value) {
            if (attrName.start("@")) {
                attrName = attrName.substr(1, attrName.length - 1);
            }
            var attr = elem.attributes.getNamedItem(attrName);
            if (attr != null) {
                if (value == undefined || value == null) {
                    elem.removeAttribute(attrName);
                }
                else {
                    if (WS.CallEvent(elem, "onSetAttr", attrName, value)) {
                        attr.value = value;
                    }
                    ;
                }
            }
            else {
                if (value == undefined || value == null) {
                    elem.removeAttribute(attrName);
                }
                else {
                    if (WS.CallEvent(elem, "onSetAttr", attrName, value)) {
                        attr = elem.setAttribute(attrName, value + "");
                    }
                }
            }
            return elem;
        };

        WS.AddAttribute = function (elem, attrName, value) {
            if (attrName.start("@")) {
                attrName = attrName.substr(1, attrName.length - 1);
            }
            var attr = elem.attributes.getNamedItem(attrName);
            if (attr != null) {
                if (WS.CallEvent(elem, "onSetAttr", attrName, value)) {
                    attr.value += value;
                }
                ;
            }
            else {
                if (WS.CallEvent(elem, "onSetAttr", attrName, value)) {
                    attr = elem.setAttribute(attrName, value + "");
                }
            }
            return elem;
        };

        WS.DelAttribute = function (elem, attrName) {
            if (attrName.start("@")) {
                attrName = attrName.substr(1, attrName.length - 1);
            }
            elem.removeAttribute(attrName);
            return elem;
        };

        WS.SetClass = function (elem, value) {
            var classes = value.split('.');
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].length > 0) {
                    if (elem.classList == undefined) {
                        if (elem.className.indexOf(classes[i]) < 0) {
                            if (WS.CallEvent(elem, "onAddClass", classes[i])) {
                                elem.className += " " + classes[i] + " ";
                            }
                        }
                    }
                    else {
                        if (WS.CallEvent(elem, "onAddClass", classes[i])) {
                            elem.classList.add(classes[i]);
                        }
                    }
                }
            }
            return elem;
        };

        WS.ResetClass = function (elem, value) {
            var classes = value.split('.');
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].length > 0) {
                    if (elem.classList != undefined) {

                        if (WS.CallEvent(this, "onDelClass", classes[i])) {
                            elem.classList.remove(classes[i]);
                        }
                    }
                    else {
                        var regex = new RegExp('(?:\\s|^)' + classes[i] + '(?:\\s|$)');
                        elem.className = elem.className.replace(regex, ' ');
                    }
                    ;
                }
            }

            return elem;
        };

        WS.ParseParams = function () {
            var obj = {
                other: [],
                parents: [],
                attributes: [],
                classes: [],
                id: null,
                inner: null,
                elements: [],
                functions: [],
                tree: [],
                count: 0,
                empty: true
            };
            for (var i = 0; i < arguments.length; i++) {
                var entity = arguments[i];
                WS.ParseParam(entity, obj);
            }
            return obj;
        };


        WS.ParseParam = function (entity, obj) {

            if (entity == undefined || entity == null || entity.length == 0) {
                return;
            }
            obj.count++;
            obj.empty = false;
            if (typeof (entity) == "string") {
                if (entity.start('.')) {
                    obj.classes.push(WS.GetParamValue(".", entity));
                    return obj;
                }
                if (entity.start('@')) {
                    obj.attributes.push(WS.GetParamValue("@", entity));
                    return obj;
                }
                if (entity.start('$')) {
                    obj.inner = WS.GetParamValue("$", entity);
                    return obj;
                }
                if (entity.start('#')) {
                    obj.id = WS.GetParamValue("#", entity);
                    return obj;
                }
                if (entity.start('^')) {
                    obj.parents.push(WS.GetParamValue("^", entity));
                    return obj;
                }
                obj.other.push(entity);
                return obj;
            }
            if (entity.length || entity.IsElementArray) {
                for (var j = 0; j < entity.length; j++) {
                    WS.ParseParam(entity[j], obj);
                }
                return obj;
            }
            if (entity instanceof HTMLElement) {
                obj.elements.push(entity);
                return obj;
            }
            if (typeof (entity) == 'function') {
                obj.functions.push(entity);
                return obj;
            }
            if (typeof (entity) == 'object') {
                obj.tree.push(entity);
                return obj;
            }
            return obj;
        };

        WS.GetParamValue = function (separator, value) {
            return value.split(separator)[1];
        };


        WS.InitW();
    }
    else {

    }

    if (!using("Log")) {
        Log = L = {};
        Log.Add = Log.add = function () {
        };
        Log.LogInfo = function () {
        };
        Log.LogWarn = function () {
        };
        Log.LogError = function () {
        };
        Log.LogObject = function () {
        };
    }

    if (window.ev == undefined) {
        Events = {};
    }

    Sync = function () {
        this.handlers = [];
    };

    Sync.prototype = {
        callThere: function (callback) {
            callback.ready = true;
            this.handlers.push(callback);
            return callback;
        },

        check: function () {
            var syncProto = this;
            var i = this.handlers.length;
            var func = function () {
                syncProto.handlers[i] = {};
                syncProto.handlers[i].ready = true;
                syncProto._checkHandlers();
            }
            func.ready = false;
            this.handlers[i] = func;
            return func;
        },

        add: function (callback) {
            var syncProto = this;
            var i = this.handlers.length;
            var func = function () {
                syncProto.handlers[i] = callback;
                syncProto.handlers[i].ready = true;
                syncProto.handlers[i].thisParam = this;
                syncProto.handlers[i].args = arguments;
                syncProto._checkHandlers();
            };
            func.ready = false;
            this.handlers[i] = func;
            return func;
        },

        _checkHandlers: function () {
            var handlersReady = true;
            for (var j = 0; j < this.handlers.length; j++) {
                handlersReady = handlersReady && (this.handlers[j].ready);
            }
            if (handlersReady) {
                for (var j = 0; j < this.handlers.length; j++) {
                    var hCall = this.handlers[j];
                    if (typeof(hCall) == 'function') {
                        hCall.apply(hCall.thisParam, hCall.args);
                    }
                }
            }
        }
    };

    Events.url = "events.js";

    Events.Init = function () {
        UsingDOM("events", "Ev");
        for (elem in Events) {
            ev[elem] = Events[elem];
        }
        ev.id = "Events_System";
    };

    Events._prescribe = {};

    Events.CreateEvent = function (name, parent, singleEvent) {
        var lname = name.toLowerCase();
        var event = ev[lname] = ev._div(".event");
        event.id = lname;
        event.name = lname;
        event.single = singleEvent;
        event.cls('.single');
        if (parent != undefined && parent != null) {
            parent[name] = event;
            /*if (lname.toLowerCase().start('on')){
var sname = name.substr(2);
parent[sname] = function(){
parent[name].fire.apply(parent[name], arguments);
}
}*/
            event.parent = parent;
        }
        event.__domAdd = event.add;
        event.__domDel = event.del;
        for (var member in SysEvent) {
            event[member] = SysEvent[member];
        }
        event.add = event._add = event.Add = SysEvent.add;
        event.del = event._del = event.Del = SysEvent.del;
        event.init(lname, parent);
        var ps = Events._prescribe[name];
        if (ps) {
            for (var i = 0; i < ps.length; i++) {
                event.add(ps[i].handler, ps[i].condition);
            }
            delete Events._prescribe[name];
        }
        return event;
    };

    Events.CheckEvent = function (name) {
        var lname = name.toLowerCase();
        var event = e._get("#" + lname);
        if (check(event)) event = ev.CreateEvent(name);
        return event;
    };


    Events.IsFired = function (name, condition) {
        name = name.toLowerCase();
        var event = null;
        if (condition) {
            event = ev._Get("." + name + " .event-fire[condition='" + condition + "']");
        }
        else {
            event = ev._Get("." + name + ".event-fire");
        }
        return event != null;
    };

    Events.AddHandler = function (name, handler, condition) {
        name = name.toLowerCase();
        var event = ev[name];
        if (event == undefined) {
            if (!Events._prescribe[name]) Events._prescribe[name] = [];
            Events._prescribe[name].push({handler: handler, condition: condition});
            //Log._add("$SysEvent prescribe!", ".event-system", { caller: "EventSystem.AddHandler", EventName: name });
            //Log._add("$SysEvent Not found!", ".event-system", { caller: "EventSystem.AddHandler", EventName: name });
            return;
        }
        event.add(handler, condition);
        var lastFired = event.lastFired(condition);
        if (lastFired) {
            event.handle(handler, condition, lastFired.argument);
        }
    };

    Events.On = Events.on = function (name, condition, handler) {
        if (typeof(condition) == 'function') {
            handler = condition;
            condition = null;
        }
        return Events.AddHandler(name, handler, condition);
    };

    SysEvent = {};

    SysEvent.init = function (name, parent) {
        this.parent = parent;
        if (check(name)) {
            this.name = name;
        }
        else {
            this.name = null;
        }
    };

    SysEvent.add = function (handler, condition) {
        if (typeof handler == 'function') {
            this.subscribe(handler, condition);
        }
        if (window.Log && window.Log.Debug) {
            return this.__domAdd.apply(this, arguments);
        }
        return null;
    };

    SysEvent.del = function (handler, condition) {
        if (typeof handler == 'function') {
            this.unsubscribe(handler, condition);
        }
        if (window.Log && window.Log.Debug) {
            return this.__domDel.apply(this, arguments);
        }
        return null;
    };

    SysEvent.unsubscribe = function (handler, condition) {
        if (condition) {
            var handlers = this._all(".handler[condition='" + condition + "']");
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i].handlers == handler) {
                    handlers[i]._del();
                }
            }
        }
        else {
            var handlers = this._all('.handler:not[condition]');
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i].handlers == handler) {
                    handlers[i]._del();
                }
            }
        }
        this.attr("handlers", this._all('.handler').length);
    };

    SysEvent.subscribe = SysEvent.on = function (handler, condition) {
        if (handler != undefined && handler != null) {
            var h = this._div(".handler");
            if (condition != undefined) {
                h.condition = condition;
                h._add(".condition");
                h._attr("condition", condition);
            }
            h.handler = handler;
            this._attr("handlers", this._all('.handler').length);
            if (this.single && this.isFired(condition)) {
                if (L && L.Info) {
                    L.Info.call(Ev, "subscribe", "last fired process on", this.name, condition);
                }
                this.handle(h, condition);
            }
        }

    };

    SysEvent.unsubscribe = function (handler, condition) {
        if (condition) {
            var handlers = this._all(".handler[condition='" + condition + "']");
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i].handlers == handler) {
                    handlers[i]._del();
                }
            }
        }
        else {
            var handlers = this._all('.handler:not[condition]');
            for (var i = 0; i < handlers.length; i++) {
                if (handlers[i].handlers == handler) {
                    handlers[i]._del();
                }
            }
        }
        this.attr("handlers", this._all('.handler').length);
    };

    SysEvent.clear = function () {
        var src = this;
        if (typeof(this) == 'function') {
            src = ev._get("#" + this.eventId);
        }
        src.handlers = [];
    };

    SysEvent.fire = SysEvent.emit = function (condition, params) {
        //	if (Request && Request.Params.debug){
        {
            this.currentFire = this._div(".event-fire");
            this.currentFire._set("@name", this.name);
            this.currentFire._set("@date", (new Date()).formatTime(true));
            if (condition) {
                this.currentFire._set("@condition", condition);
            }
            this.currentFire.argument = params;
        }
        var result = true;
        var success = 0;
        var handlers = this._all('.handler');
        for (var i = 0; i < handlers.length; i++) {
            var handler = handlers[i];
            var funcRes = this.handle(handler, condition, params);
            if (typeof funcRes == 'boolean') {
                result &= funcRes;
                if (funcRes) {
                    success++;
                }
            }
            else {
                if (funcRes == "del") {
                    handler._del();
                }
            }
            if (!result) {
                this.currentFire.innerHTML += success + " on " + i + " handler stop processing";
                return false;
            }
        }
        this.attr("handlers", this._all('.handler').length);
        this.currentFire.innerHTML += success + " handler processed succesfully";
        return true;
    };


    SysEvent.handle = function (handler, condition, params) {
        if (handler.condition) {
            if (handler.condition == condition) {
                handler = handler.handler;
                if (typeof(handler) != "function" && handler[this.name] != undefined) {
                    return handler[this.name].call(this, condition, params);
                }
                return handler.call(this, condition, params);
            }
        }
        else {
            handler = handler.handler;
            if (typeof(handler) != "function" && handler[this.name] != undefined) {
                return handler[this.name].call(this, condition, params);
            }
            return handler.call(this, condition, params);
        }
        return null;
    };


    SysEvent.isFired = function (condition) {
        return this.lastFired(condition) != null;
    };

    SysEvent.firesCount = function (condition) {
        var event = "";
        if (condition) {
            event = this._all(".event-fire[condition='" + condition + "']");
        }
        else {
            event = this._all(".event-fire");
        }
        return event.length;
    };


    SysEvent.lastFired = function (condition) {
        var event;
        if (condition) {
            event = this.aget("condition", condition, ".event-fire");
        }
        else {
            event = this._get(".event-fire");
        }
        return event;
    };

    if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", Events.Init, false);
    }
    else {
        window.addEventListener("load", Events.Init, false);
    }


    Channel = function (route) {
        this.name = route;
        this.routes = {$path: "/"};
    }

    Channel.RouteNode = function (route) {
        route = route.replace(/\$/ig, ""); //Чтобы предотвратить перезапись внутренних функций в узлах
        this.source = route;
        this.type = "*";
        this.tags = [];
        this.components = [];
        if (route) {
            route = route.split(".");
            if (route.length > 0) {
                if (route[0] != "") {
                    this.type = route[0].toLowerCase();
                }
                route.shift();
                this.components.push(this.type);
                var i = 0;
                while (i < route.length) {
                    if (route[i] == "") {
                        route.splice(i, 1);
                    }
                    else {
                        route[i] = route[i].toLowerCase();
                        this.components.push("." + route[i]);
                        i++;
                    }
                }
                this.tags = route;
            }
        }
        this.is = function (other) {
            if (other.type != "*" && other.type != this.type) {
                return false;
            }
            for (var i = 0; i < other.tags.length; i++) {
                if (this.source.indexOf("." + other.tags[i]) < 0) {
                    return false;
                }
            }
            return true;
        };
        this.setType = function (otherType) {
            this.type = otherType;
            if (this.components.length > 0) this.components[0] = otherType;
        };
    };

    Channel.RouteNode.prototype.toString = function () {
        var str = this.type;
        if (this.tags.length > 0) {
            str += "." + this.tags.join(".");
        }
        return str;
    };

    Channel.Route = function (route) {
        if (!route || route == "") return null;
        if (typeof route != "string") {
            route.push(0);
        }
        if (route.indexOf("/") != 0) {
            route = "/" + route;
        }
        this.source = route;
        this.nodes = route.split("/");
        this.nodes.shift();
        this.components = [];
        for (var i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i] == "") this.nodes[i] = "*";
            this.nodes[i] = new Channel.RouteNode(this.nodes[i]);
            this.components = this.components.concat(this.nodes[i].components);
        }

    };

    Channel.Route.prototype = {
        clone: function () {
            var newRoute = new Channel.Route(this.source);
            for (var item in this) {
                if (item != "source" && item != "nodes" && item != "components" && !Channel.Route.prototype[item]) {
                    newRoute[item] = this[item];
                }
            }
            return newRoute;
        },

        is: function (other) {
            other = Channel.ParsePath(other);
            thisRoute = Channel.ParsePath(this.source);
            if (thisRoute.nodes.length < other.nodes.length) {
                return false;
            }
            for (var i = 0; i < other.nodes.length; i++) {
                if (!thisRoute.nodes[i].is(other.nodes[i])) return false;
            }
            return true;
        }
    }


    Channel.Route.prototype.toString = function (index) {
        var str = "";
        index = parseInt(index);
        if (!isNaN(index) && index >= 0 && index < this.nodes.length) {
            for (var i = index; i < this.nodes.length; i++) {
                str += "/" + this.nodes[i].toString();
            }
        }
        return str;
    };


    Channel.ParsePath = function (route) {
        if (!route) return null;
        if (typeof route == "string") return new Channel.Route(route);
        if (typeof route == "object") {
            if (route instanceof Channel.RouteNode) {
                return new Channel.Route(route);
            }
            if (route instanceof Channel.Route) {
                return route;
            }
        }
        return null;
    }

    Channel.prototype.once = Channel.prototype._single = function (path, callback) {
        callback.callMode = "single";
        return this.on(path, callback);
    }

    Channel.prototype.on = Channel.prototype.for = Channel.prototype.subscribe = Channel.prototype.add = Channel.prototype._addListener = function (route, callback) {
        route = Channel.ParsePath(route);
        if (!route) return null;
        if (!callback) return null;
        callback.id = (Math.random() + "").replace("0.", "handler");
        var path = [];
        var root = this._createRoute(this.routes, route, path);
        if (root && path.length > 0) {
            var result = true;
            for (var i = 0; i < path.length; i++) {
                var tunnels = path[i]["$tunnels"];
                if (tunnels) {
                    var j = 0;
                    var param = {
                        source: route.source,
                        path: path[i].$path,
                        current: route.source.replace(path[i].$path, "")
                    };
                    while (j < tunnels.length) {
                        var res = tunnels[j].call(route, param);
                        if (res == null) {
                            tunnels.splice(j, 1);
                        }
                        else {
                            if (res == false) {
                                result = false;
                                break;
                            }
                        }
                        j++;
                    }
                    if (result == false) break;
                }
            }
            if (result) {
                return this._addRouteHandler(root, callback);
            }
        }
        return null;
    };

    Channel.prototype._addRouteHandler = function (root, callback) {
        if (!root) return null;
        if (!callback) return null;
        if (root) {
            if (!root["."]) {
                root["."] = [];
            }
            root["."].push(callback);
            return callback;
        }
        return null;
    };

    Channel.prototype._getRoute = function (root, route, path) {
        if (!root) return null;
        if (!route) return null;
        var nodes = route.components;
        for (var i = 0; i < nodes.length; i++) {
            var inner = root[nodes[i]];
            if (!inner) {
                return null;
            }
            if (path) path.push(inner);
            root = inner;
        }
        return root;
    };

    Channel.prototype._createRoute = function (root, route, path) {
        if (!root) return null;
        if (!route) return null;
        var nodes = route.components;
        var itemsPath = "";
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].length == 0) continue;
            if (nodes[i][0] == ".") {
                itemsPath += nodes[i];
            }
            else {
                itemsPath += "/" + nodes[i];
            }
            var inner = root[nodes[i]];
            if (!inner) {
                inner = root[nodes[i]] = {};
                inner.$path = itemsPath;
            }
            if (path) path.push(inner);
            root = inner;
        }
        return root;
    };


    Channel.prototype.onSubscribe = function (route, callback) {
        route = Channel.ParsePath(route);
        if (!route) return null;
        if (!callback) return null;
        var root = this._createRoute(this.routes, route)
        if (root) {
            if (!root['$tunnels']) {
                root['$tunnels'] = [];
            }
            root['$tunnels'].push(callback);
            return root;
        }
        return null;
    };

    Channel.prototype.clear = Channel.prototype._removeListeners = function (route, handler) {
        route = Channel.ParsePath(route);
        if (!route) return null;
        if (route.nodes.length == 0) return null;
        return this._removeHandler(this._getRoute(this.routes, route), handler);
    };

    Channel.prototype._removeHandler = function (root, handler) {
        if (!root) return null;
        if (!root["."]) return false;
        var i = 0;
        if (handler) {
            var handlers = root["."];
            while (i < handlers.length) {
                if (typeof handler == "function") {
                    if (handlers[i] == handler) {
                        handlers.splice(i, 1);
                        continue;
                    }
                }
                if (typeof handler == "string") {
                    if (handlers[i].id == handler) {
                        handlers.splice(i, 1);
                        continue;
                    }
                }
                i++;
            }
        }
        else {
            root["."] = [];
        }
        return true;
    };


    Channel.prototype._removeRoute = function (root, nodes) {
        if (!root) return null;
        if (!nodes) return null;
        if (nodes.length == 0) {
            return true;
        }
        for (var i = 0; i < nodes.length; i++) {
            var inner = root[nodes[i]];
            if (inner) {
                if (this._removeRoute(inner, nodes.slice(0, i).concat(nodes.slice(i + 1)), args)) {
                    delete root[nodes[i]];
                }
            }
        }
        return false;
    };

    Channel.prototype.predefine = function (route, message) {
        var self = this;
        this.onSubscribe(route, function () {
            setTimeout(function () {
                self.emit(route, message);
            }, 1);
        });
    };

    Channel.prototype.emit = function (route) {
        var route = Channel.ParsePath(route);
        if (!route) return;
        if (route.nodes.length == 0) return null;
        route.id = (Math.random() + "").replace("0.", "");
        var root = this.routes;
        route.callplan = [];
        var count = this._sendMessage(root, route, 0, arguments);
        for (var i = route.callplan.length - 1; i >= 0; i--) {
            route.callplan[i]();
        }
        return count;
    };

    Channel.prototype._sendMessage = function (root, route, nodeIndex, args) {
        if (!root) return null;
        if (!route) return null;
        var counter = 0;
        if (nodeIndex < route.nodes.length) {
            var node = route.nodes[nodeIndex];
            counter += this._sendInternal(root[node.type], nodeIndex, route, node.tags, args);
            counter += this._sendInternal(root["*"], nodeIndex, route, node.tags, args);
        }
        return counter;
    };

    Channel.prototype._sendInternal = function (root, nodeIndex, route, tags, args) {
        if (!root) return null;
        if (!tags) return null;
        var param = {
            source: route.source,
            path: root.$path,
            current: route.toString(nodeIndex + 1),
            timestamp: (new Date()).valueOf(),
            id: route.id
        };
        //console.log(param);
        var counter = this._callHandlers(root["."], route, param, args);
        if (counter > 0) {
            //console.log(root.$path.warn);
        }
        else {
            //console.log(root.$path);
        }
        for (var i = 0; i < tags.length; i++) {
            if (tags[i] == "") continue;
            var inner = root["." + tags[i]];
            if (inner) {
                counter += this._sendInternal(inner, nodeIndex, route, tags.slice(0, i).concat(tags.slice(i + 1)), args);
            }
        }
        counter += this._sendMessage(root, route, nodeIndex + 1, args);
        return counter;
    };

    Channel.prototype._callHandlers = function (handlers, route, param, args) {
        var counter = 0;
        if (handlers) {
            var i = 0;
            while (i < handlers.length) {
                if (handlers[i] != null) {
                    counter++;
                    this._callHandlerAsync(route, handlers[i], param, args);
                    if (handlers[i].callMode && handlers[i].callMode == "single") {
                        handlers[i] = null;
                        handlers.splice(i, 1);
                    }
                    else {
                        i++;
                    }
                }
            }
        }
        return counter;
    }

    Channel.prototype._callHandlerAsync = function (route, callback, param, args) {
        var channel = this;
        var param1 = args[1];
        var param2 = args[2];
        var param3 = args[3];
        var param4 = args[4];
        var param5 = args[5];

        function callCallback() {
            if (channel == Channels) {
                return callback.call(route, param1, param2, param3, param4, param5);
            }
            else {
                return callback.call(channel, param, param1, param2, param3, param4, param5);
            }
        }

        if (route.callplan) {
            route.callplan.push(callCallback);
        }
        else {
            setTimeout(callCallback, 2);
        }
    }


    Channels = new Channel("/");

    EventEmitter = function () {
        this._eventHandlers = {};
    }

    EventEmitter.prototype.once = function (path, callback) {
        callback._isSingleCall = "single";
        return this.on(path, callback);
    }

    EventEmitter.prototype.on = function (route, callback) {
        if (!this._eventHandlers[route]) this._eventHandlers[route] = [];
        this._eventHandlers[route].push(callback);
        return callback;
    };

    EventEmitter.prototype.clear = function (route, handler) {
        if (!this._eventHandlers[route]) return false;
        delete this._eventHandlers[route];
        return true;
    };

    EventEmitter.prototype.un = function (route, handler) {
        if (!this._eventHandlers[route]) return false;
        var handlers = this._eventHandlers[route];
        for (var i = handlers.length - 1; i >= 0; i--) {
            if (handlers[i] == handler) {
                handlers.splice(i, 1);
            }
        }
        return true;
    };

    EventEmitter.prototype.do = EventEmitter.prototype.emit = EventEmitter.prototype.fire = function (route) {
        if (!this._eventHandlers[route]) return null;
        var handlers = this._eventHandlers[route];
        var result = null;
        for (var i = handlers.length - 1; i >= 0; i--) {
            result = this._callHandlerAsync(route, handlers[i], arguments);
            if (handlers[i]._isSingleCall) {
                handlers.splice(i, 1);
            }
        }
        return result;
    };

    EventEmitter.prototype._callHandlerAsync = function (route, callback, arguments) {
        if (!callback) return false;
        return callback.apply(this, arguments);
    }

    Eventer = function () {
        this.handlers = {};
        //this.quickHandlers = [];
    };

    var __EventEmitterPrototype = {
        bind: function () {
            var event = arguments[0];
            for (var i = 0; i < arguments.length; i++) {
                arguments[i] = arguments[i + 1];
            }
            arguments.length--;
            var handler = CreateClosure.apply(this, arguments);
            this.subscribe(event, handler);
        },

        once: function (event, handler) {
            handler._eventFlagOnce = true;
            this.subscribe(event, handler);
        },


        clear: function (event) {
            if (!this.handlers[event]) return false;
            this.handlers[event] = null;
            return true;
        },

        subscribe: function (event, handler) {
            if (event && typeof(handler) == "function") {
                event = event + "";
                if (!this.handlers[event]) {
                    this.handlers[event] = [];
                }
                this.handlers[event].push(handler);
            }
        },

        unsubscribe: function (handler) {
            for (var event in this.handlers) {
                this._unsubscribeHandler(event, handler);
            }
        },

        _unsubscribeHandler: function (event, handler) {
            for (var i = 0; i < this.handlers[event].length; i++) {
                if (this.handlers[event][i] == handler) {
                    this.handlers[event][i].splice(i, 1);
                    i--;
                    continue;
                }
            }
        },

        fire: function () {
            var event = arguments[0];
            if (this.handlers[event] && this.handlers[event].length) {
                for (var i = 0; i < arguments.length; i++) {
                    arguments[i] = arguments[i + 1];
                }
                arguments.length--;
                for (var i = 0; i < this.handlers[event].length; i++) {
                    var handler = this.handlers[event][i];
                    if (handler._eventFlagOnce) {
                        this.handlers[event].splice(i, 1);
                        i--;
                    }
                    handler.apply(this, arguments);
                }
            }
        },
    }

    __EventEmitterPrototype.add = __EventEmitterPrototype.on = __EventEmitterPrototype.subscribe;

    __EventEmitterPrototype.del = __EventEmitterPrototype.unsubscribe;

    __EventEmitterPrototype.emit = __EventEmitterPrototype.do = __EventEmitterPrototype.fire;

    (function () {
        for (var item in __EventEmitterPrototype) {
            Eventer.prototype[item] = __EventEmitterPrototype[item];
        }
    })();

    Request = {
        Params: {},

        CreateUrl: function (file, param0, param1, param2, param3, param4, param5, param6) {
            var url = "http://" + Request.Host + "/" + file;
            if (param0 != undefined && param0 != null) {
                url += "?" + param0;
            }
            if (param1 != undefined && param1 != null) {
                url += "&" + param1;
            }
            if (param2 != undefined && param2 != null) {
                url += "&" + param2;
            }
            if (param3 != undefined && param3 != null) {
                url += "&" + param3;
            }
            if (param4 != undefined && param4 != null) {
                url += "&" + param4;
            }
            if (param5 != undefined && param5 != null) {
                url += "&" + param5;
            }
            if (param6 != undefined && param6 != null) {
                url += "&" + param6;
            }
            return url;
        },

        GetParam: function (paramName) {
            var param = Request.Params[paramName];
            if (param == undefined) return null;
            return param;
        },

        GetUrl: function (file, params) {
            var url = file;
            if (!file.start("/")) {
                if (!file.start("http://") && !file.start("https://")) {
                    if (file.contains("/")) {
                        url = "http://" + file;
                    }
                    else {
                        url = "/" + file;
                    }
                }
            }
            var paramsString = "";
            for (var param in params) {
                paramsString += "&" + param + "=" + encodeURIComponent(params[param]);
            }
            if (paramsString.length > 0) {
                paramsString = "?" + paramsString.substr(1);
                ;
            }
            return url + paramsString;
        },

        ParseRequest: function () {
            var parts = window.location.search.split("&");
            for (var i = 0; i < parts.length; i++) {
                var parameters = parts[i].split("=");
                var partName = parameters[0];
                partName = partName.replace('?', '');
                var partValue = parameters[1];
                Request.Params[partName] = decodeURIComponent(partValue);
            }
            Request.Host = window.location.host;
            Request.File = window.location.pathname.replace("/", "");
        },

        Redirect: function (file, params) {
            window.location = Request.GetUrl(file, params);
        },

        ParseUrl: function (url) {
            var rq = {};
            if (url.start("http://")) {
                url = url.substr(7);
            }
            var slash = url.indexOf("/");
            if (slash < 0) {
                rq.host = url;
                return rq;
            }
            rq.host = url.substr(0, slash);
            url = url.substr(slash + 1);
            var par = url.indexOf("?");
            if (par < 0) {
                rq.file = url;
                return rq;
            }
            rq.params = {};
            rq.file = url.substr(0, par);
            url = url.substr(par + 1);
            var parts = url.split("&");
            for (var i = 0; i < parts.length; i++) {
                var parameters = parts[i].split("=");
                var partName = parameters[0];
                var partValue = parameters[1];
                rq.params[partName] = partValue;
            }
            return rq;
        }
    };

    Request.ParseRequest();

    Url = function (href, baseOnly) {
        //this.toString = Url.ToString;
        if (href) {
            Url.Parse(href, this, baseOnly);
        }
        else {
            Url.Parse(window.location.href, this, false);
        }
    };

    Url.getLocation = function (href) {
        var match = href.match(/^(https?\:)\/\/(([^:\/?#]*)(?:\:([0-9]+))?)(\/[^?#]*)(\?[^#]*|)(#.*|)$/);
        return match && {
            protocol: match[1],
            host: match[2],
            hostname: match[3],
            port: match[4],
            pathname: match[5],
            search: match[6],
            hash: match[7]
        }
    }

    Url.Parse = Url.parse = function (href, urlObject, baseOnly) {
        if (!urlObject) urlObject = new Url();
        if (!href.contains("://")) {
            if (href.start("/")) {
                if (window.location.pathname.ends("/")) {
                    href = href.replace("/", "");
                }
                href = window.location.pathname + href;
            }
            if (href.start("./")) {
                href = href.replace(".", "");
                href = window.location.origin + href;
            }
            if (href.start("../")) {
                href = href.replace("..", "");
                href = window.location.origin + href;
            }
        }
        var a = document.createElement("a");
        a.href = urlObject.href = href;
        urlObject.href = a.href;
        urlObject.protocol = a.protocol;
        urlObject.host = a.host;
        urlObject.hostname = a.hostname;
        urlObject.port = a.port;
        if (baseOnly) {
            urlObject.pathname = "";
            urlObject.search = "";
            urlObject.hash = "";
        }
        else {
            urlObject.pathname = a.pathname;
            urlObject.search = a.search;
            urlObject.hash = a.hash;
            urlObject.fill();
        }
        return urlObject;
    };

    Url.Resolve = function (relative, params) {
        var url = new Url(relative);
        url.params = {};
        if (typeof(params) == "object") {
            url.params = params;
        }
        if (typeof(params) == "string") {
            if (params.start("?")) params = params.substr(1);
            params = params.split("&");
            for (var i = 0; i < params.length; i++) {
                if (params[i] && params[i].length > 0) {
                    var param = params[i].split("=");
                    var value = param[1];
                    if (value) {
                        value = decodeURIComponent(value);
                    }
                    url.params[param[0]] = value;
                }
            }
        }
        for (var param in url.params) {
            url.search += "&" + param + "=" + encodeURIComponent(url.params[param]);
        }
        if (url.search.length > 0 && !url.search.start("?")) {
            url.search = url.search.replace("&", "?");
        }
        return url;
    };

    Url.prototype = {
        getBase: function () {
            var url = this.protocol + "//" + this.hostname;
            if (this.port && this.port != "") {
                url += ":" + this.port;
            }
            return url;
        },

        toString: function () {
            var url = this.protocol + "//" + this.hostname;
            if (this.port && this.port != "") {
                url += ":" + this.port;
            }
            url += this.pathname + this.search + this.hash;
            return url;
        },

        fill: function () {
            this.path = this.pathname.split("/");
            this.path.shift();
            if (this.path.length == 1 && this.path[0] == "") {
                this.path = null;
            }
            if (this.path) {
                this.file = this.path[this.path.length - 1];
            }
            this.params = {};
            var params = this.search.replace("?", "").split("&");
            for (var i = 0; i < params.length; i++) {
                if (params[i] && params[i].length > 0) {
                    var param = params[i].split("=");
                    var value = param[1];
                    if (value) {
                        value = decodeURIComponent(value);
                    }
                    this.params[param[0]] = value;
                }
            }
        },

        resolve: function (relative) {
            if (!relative.contains("://")) {
                if (this.pathname.ends("/")) {
                    if (relative.start("/")) {
                        relative = relative.replace("/", "");
                    }
                }
                else {
                    if (relative.start("/")) {
                        relative = this.pathname + relative;
                    }
                    else {
                        if (!relative.start(".")) {
                            relative = this.pathname + "/" + relative;
                        }
                    }
                }
            }
            this.repath(relative);
            return this;
        },

        rebase: function (url) {
            if (typeof(url) == "string") {
                url = new Url(url);
            }
            this.host = url.host;
            this.hostname = url.hostname;
            this.protocol = url.protocol;
            this.port = url.port;
            return this;
        },

        repath: function (url) {
            if (typeof(url) == "string") {
                url = new Url(url);
            }
            this.pathname = url.pathname;
            this.search = url.search;
            this.hash = url.hash;
            this.fill();
            return this;
        },

        addParam: function (name, value) {
            if (typeof (name) == "object") {

            }
            if (value) {
                var param = name + "=" + encodeURIComponent(value);
            }
            else {
                var param = name;
            }
            if (this.search.length > 0) {
                param = "&" + param;
            }
            else {
                param = "?" + param;
            }
            this.search += param;
            this.fill();
            return this;
        },
    };

    if (!UsingDOM("Log")) {

        L = Log;

        Log.OperationSize = 12;

        L.Init = function () {
            if (L.initialized) return false;
            //EV.CreateEvent("OnError", L);
            L.LogInfo("L initialized!");
            L.initialized = true;
            if (Request) {
                L.Debug = L.debug = Request.Params.debug;
            }
        };

        L.GetLogger = function (id) {
            return {
                id: id,
                info: L.Info,
                error: L.Error
            }
        };

        L.LogInfo = function (str, module, type) {
            this.LogItem(module, str, "info", type);
            if (window.console == undefined || window.console == null) return;
            console.info(str);
        };

        L._logItem = function (operation, type, args) {
            if (window.L.debug) {
                if (!this.logId) {
                    var id = this.id;
                    if (id && id.length > 0) {
                        if (id.length >= 3) {
                            id = id.substring(0, 3);
                        }
                        else {
                            if (id.length == 2)
                                id = id + " ";
                            else
                                id = id + "  ";
                        }
                    }
                    else {
                        id = "   ";
                    }
                    this.logId = id;
                }
                var op = operation;
                if (op) {
                    if (op.length >= Log.OperationSize) {
                        op = op.substring(0, Log.OperationSize);
                    }
                    else {
                        op += new Array(Log.OperationSize - op.length).join(" ")
                    }
                }
                else {
                    op = new Array(Log.OperationSize).join(" ");
                }
                var str = this.logId + " : " + op;
                var conStr = str;
                for (var i = 1; i < args.length; i++) {
                    var text = args[i];
                    if (typeof(text) == "object") {
                        conStr += " : " + JSON.stringify(text);
                        if (window.DOM && window.DOM.formatJSON) {
                            text = DOM.formatJSON(text);
                            text = text.outerHTML;
                        }
                        else {
                            text = JSON.stringify(text);
                        }
                    }
                    else {
                        conStr += " : " + text;
                        text = (text + "").replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    }
                    str += " : " + text;
                }
                L.LogItem(this, str, type, operation, true);
                return conStr;
            }
            return null;
        };

        L.Info = function (operation) {
            var str = L._logItem.call(this, operation, "info", arguments);
            if (window.console == undefined || window.console == null) return;
            if (str) {
                console.info(str);
            }
        };

        L.Error = function (operation) {
            var str = L._logItem.call(this, operation, "error", arguments);
            if (window.console == undefined || window.console == null) return;
            if (str) {
                console.error(str);
            }
        };

        L.Log = function (operation) {
            var str = L._logItem.call(this, operation, "debug", arguments);
            if (window.console == undefined || window.console == null) return;
            if (str) {
                console.debug(str);
            }
        };

        L.LogObject = function (obj, module, type) {
            if (window.console == undefined || window.console == null) return;
            if (window.L.debug) {
                console.info(obj);
            }
        };

        L.LogWarn = function (str, module, type) {
            this.LogItem(module, str, "warn", type);
            if (window.console == undefined || window.console == null) return;
            if (module != undefined && module != null) {
                console.warn(str);
            }
            else
                console.warn(str);
        };

        L.LogError = function (e, m, module, type) {
            if (window.NoLogErrors) throw e;
            this.LogItem(module, e + " : " + module, "err", type);
            if (window.console == undefined || window.console == null) return;
            if (this.OnError) {
                this.OnError(e, m);
            }
            if (Check(module)) {
                m = module + ": " + m;
            }
            if (e.message) {
                console.error(e, e.message, m);
            }
            else {
                console.error(e, m);
            }
        };

        L.LogItem = function (module, message, type, itemType, isHtml) {
            if (window.DOM && L.debug) {
                var item = DOM.div(".item");
                item.cls("item");
                item.cls(type);
                item.attr("type", type);
                if (module && module.id) {
                    item.add("." + module.id);
                }
                ;
                if (Check(itemType)) {
                    item.cls(itemType);
                }
                if (module && module.id) {
                    item.attr("module-id", module.id);
                }
                ;
                if (module && module.url) {
                    item.attr("module-url", module.url);
                }
                ;
                var date = new Date();
                item.attr('date-val', date.valueOf());
                item.attr('date', date.formatTime(true));
                item.attr("itemType", itemType);
                if (isHtml) {
                    item.html((message + ""));
                }
                else {
                    item.html((message + "").replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                }
                item.module = module;
                item.message = message;
                item.logtype = type;
                item.itemtype = itemType;
                L.add(item);
            }
        };

        WS.DOMload(L.Init);
    }
    else {
        L.LogError("reinitializing L!");
    }

    if (!UsingDOM("Contexts")) {

        C = Contexts;

        C.id = "Jasp_Contexts";

        C.url = "jasp.js";

        if (L) {
            C.info = L.Info;
            C.error = L.Error;
        }
        else {
            C.info = C.error = function (message) {
                console.log(message);
            };
        }

        C.ContextsCounter = 1;

        C.Add = C.add = function () {
            var obj = arguments[0];
            if (obj && (obj) instanceof Object && !((obj) instanceof HTMLElement)) {
                obj[".context"] = null;
                if (obj.ContextId) {
                    if (!obj.id) {
                        obj.id = obj.ContextId;
                    }
                }
                else {
                    if (obj.id) {
                        obj.ContextId = obj.id;
                    }
                    else {
                        obj.ContextId = C.ContextsCounter;
                        obj.id = 'context' + C.ContextsCounter;
                        C.ContextsCounter++;
                    }
                }
                if (obj.Condition) {
                    obj["." + obj.Condition] = null;
                }
                L.LogObject(obj);
            }
            return this._add(arguments);
        };

        C.AddContext = function (processor, context, selector, type, priority) {
            var obj = {
                "context": context,
                "for": selector,
                "processor": processor,
                "priority": priority,
                "type": type
            };
            var cnt = C.add(obj);
            cnt.context = context;
            return cnt;
        };

        C.Process = function (element, condition, param1) {
            //C.info("proc-start", condition, " in " + element.ToString());
            founded = 0;
            if (condition) {
                var contexts = C._all(".context." + condition);
                for (var c = 0; c < contexts.length; c++) {
                    var context = contexts[c];
                    if (this.ProcessContext(element, context, param1)) {
                        founded++;
                    }
                    ;
                }
            }
            //C.info("proc-end", condition, founded, " in " + element.ToString());
        };

        C.ProcessContext = function (element, context, param1) {
            var url = element._get("@url");
            if (context.OnlyChilds != undefined && context.OnlyChilds) {
                var tags = element.childs(context.Selector);
            }
            else {
                var tags = element._all(context.Selector);
            }
            var found = 0;
            var processed = 0;
            for (var i = 0; i < tags.length; i++) {
                var elem = tags[i];
                if (elem._is(".jasp-processed-" + context.ContextId)) {
                    L.LogWarn("Context " + context.ContextId + "(" + context.Selector + ") already processed on " + elem.ToString(), "Jasp.js");
                }
                found++;
                C.info("proc-found", elem.ToString());
                if (elem._is(".jasp-processing-" + context.ContextId)) {
                    L.LogWarn("Context " + context.ContextId + "(" + context.Selector + ") in progress on " + elem.ToString(), "Jasp.js");
                    continue;
                }
                var result = context.Process(elem, context, element, param1);
                if (result) {
                    processed++;
                    if (!elem.processedContexts) elem.processedContexts = " ";
                    elem.processedContexts += context.ContextId + " ";
                    elem.cls("jasp-processed-" + context.ContextId);
                }
                else {
                    if (result != null) {
                        processed++;
                        elem.cls("jasp-processing-" + context.ContextId);
                    }
                }
            }
            return processed;
        };

        function GetNodesBySelector(selector) {
            if (selector.start("this")) {
                selector = selector.replace("this", "");
                selector = selector.trim();
                var result = this._all(selector);
            }
            else {
                var result = DOM._all(selector);
            }
            return result;
        };

        HTMLElement.prototype["GetNodesBySelector"] = GetNodesBySelector;

        L.LogInfo("Contexts created!");
    }
    else {
        L.LogError("Reinitilizing Contexts!");
    }

    if (!using("Jasp")) {
        J = Jasp = {IsOlmObject: true};

        J.id = "JPR";

        J.url = "jasp.js";

        J.info = L.Info;

        J.ContextContext = {Selector: "context", Condition: "module-parsing"};
        J.ContextContext.Selector = "context";
        J.ContextContext.Process = function (element) {
            var context = {};
            context.Selector = element.attr("selector");
            context.Condition = element.attr("condition");
            context.OnlyChilds = element.attr("onlychilds");
            context.element = element;
            context.code = element.innerHTML;
            context.module = element._get("^.module");
            context.Process = J.ProcessContext;
            C.Add(context);
            element._add(".processed");
            return true;
            //Contexts.ProcessContext(W.Body, context);
        }

        C.Add(J.ContextContext);

        J.ProcessContext = function (element, context, processingElem, param1) {
            var Processor = {};
            Processor.Element = element;
            Processor.Context = context;
            Processor.ProcessingElement = processingElem;
            Processor.Param = param1;
            Processor.ContextElement = context.element;
            try {
                with (Processor) {
                    eval(context.code);
                }
            }
            catch (e) {
                var url = context.Selector;
                if (Check(context.module)) {
                    url += " : " + context.module.url;
                }
                L.LogError(e, "ProcessingContext : " + url, "System.Jasp.js");
            }
        };

        J.ContentContext = {Condition: "ui-processing"};
        J.ContentContext.Selector = ".content[url]:not(.loaded)";
        J.ContentContext.Process = function (element) {
            var url = element.url = element.attr("url");
            NET.GET(url, JSON.stringify({context: element}), function (result) {
                element.add(".loaded");
                element.textContent = result;
            });
            return false;
        }
        C.Add(J.ContentContext);

        J.LoadingContext = {Condition: "ui-processing"};
        J.LoadingContext.Selector = ".html-content[url]:not(.loaded)";
        J.LoadingContext.Process = function (element) {
            var url = element.url = element.attr("url");
            NET.GET(url, JSON.stringify({context: element}), function (result) {
                element.add(".loaded");
                J.ProcessLoadedContent(result, element);
            });
            return false;
        }
        C.Add(J.LoadingContext);

        J.ProcessLoadedContent = function (result, context) {
            context._add(result);
            M.ParseModule(context);
            //C.Process(context, 'ui-processing');
            /*
var scripts = context.findAll("script:not(.loaded)");
if (check(window.M) && M.IsOlmObject){
for(var i = 0; i < scripts.length; i++){
M.ProcessScript(scripts[i], context)
}
}
else{
for(var i = 0; i < scripts.length; i++){
window.eval(scripts[i].innerHTML);
}
}
*/
            var load = context.attr("onload");
            try {
                if (Check(load)) {
                    window.eval(load);
                }
            }
            catch (ex) {
                console.log(ex);
            }
            J.EndProcess(context, J.LoadingContext);
            return false;
        };

        J.JSONContext = {Condition: "ui-processing"};
        J.JSONContext.Selector = ".json-content[url]:not(.loaded)";
        J.JSONContext.ContextId = "JsonDataLoadingContext";
        J.JSONContext.Process = function (element) {
            if (element.is(".jasp-processing-" + J.JSONContext.ContextId)) return false;
            if (element.is(".jasp-processed-" + J.JSONContext.ContextId)) return false;
            var url = element.url = element.attr("url");
            if (element.textContent.trim().length > 0) {
                var tc = element.textContent;
                element.textContent = "";
                J.ProcessJSONContext(tc, element);
                return true;
            }
            else {
                if (window.Net) {
                    if (element.is(".partial-loading")) {
                        var req = Net.get(url);
                        req.lastStateChar = 0;
                        req.onreadystatechange = function () {
                            if (this.readyState == 3) {
                                var result = this.responseText;
                                if (result && result.length > 0 && result.length - 1 > this.lastStateChar && this.status == 200) {
                                    var end = result.lastIndexOf(",\n");
                                    result = result.substring(this.lastStateChar, end);
                                    this.lastStateChar = end + 1;
                                    result = result.split(",\n");
                                    for (var i = 0; i < result.length; i++) {
                                        var obj = result[i];
                                        if (obj.length > 2) {
                                            J.ProcessPartialJSONContext(obj, element);
                                        }
                                    }
                                }
                            }
                            if (this.readyState == 4) {
                                J.ProcessJSONContextComplete(result, element);
                            }

                        }

                        req.send();
                    }
                    else {
                        var req = Net.get(url, function (result) {
                            J.ProcessJSONContext(result, element)
                        });
                    }
                }
                else {
                    AX.Get(url, J.ProcessJSONContext, {context: element});
                }
            }
            return false;
        };

        C.Add(J.JSONContext);

        J.ProcessPartialJSONContext = function (result, context) {
            var idpref = context.get("@id-prefix");
            if (!idpref) idpref = "";
            try {
                var json = JSON.parse(result);
            }
            catch (err) {
                console.log("Error parsing json in " + context.url);
                console.error(err);
                json = null;
            }
            if (json) {
                var idobj = "";
                if (json.id) {
                    idobj = idpref + json.id;
                }
                if (json._id && !json.id) {
                    idobj = idpref + json._id;
                }
                var elem = context._add(J.JsonToDivObject(json, idobj));
                var onitem = context.get("@onitem");
                var cnt = {data: json, element: elem};
                try {
                    with (cnt) {
                        eval(onitem);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        J.ProcessJSONContextComplete = function (result, context) {
            context.add(".loaded");
            J.EndProcess(context, J.JSONContext);
            return false;
        };

        J.ProcessJSONContext = function (result, context) {
            var idpref = context.get("@id-prefix");
            if (!idpref) idpref = "";
            try {
                var json = JSON.parse(result.replace(/\n/g, " "));
            }
            catch (err) {
                console.log("Error parsing json in " + context.url);
                console.error(err);
                json = null;
            }
            if (json) {
                if (json.length) {
                    json.each(function (obj) {
                        var id = "";
                        if (obj.id) {
                            id = idpref + obj.id;
                        }
                        if (obj._id && !obj.id) {
                            id = idpref + obj._id;
                        }
                        var elem = context._add(J.JsonToDivObject(obj, id));
                        var onitem = context.get("@onitem");
                        var cnt = {data: obj, element: elem};
                        try {
                            with (cnt) {
                                eval(onitem);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    });
                }
                else {
                    var idobj = "";
                    if (json.id) {
                        idobj = idpref + json.id;
                    }
                    if (json._id && !json.id) {
                        idobj = idpref + json._id;
                    }
                    var elem = context._add(J.JsonToDivObject(json, idobj));
                    var onitem = context.get("@onitem");
                    var cnt = {data: json, element: elem};
                    try {
                        with (cnt) {
                            eval(onitem);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }

                context.add(".loaded");
            }
            else {

                context.add(".error");
            }
            J.EndProcess(context, J.JSONContext);
            return false;
        };

        J.JsonToDivObject = function (obj, id) {
            var div = DOM.div(".json-object");
            if (id) {
                div.set("@id", id);
            }
            for (var fld in obj) {
                var value = obj[fld];
                if (typeof(value) == "object") {
                    var field = div.add(J.JsonToDivObject(value));
                }
                else {
                    if (fld.start("_")) {
                        div.set("@" + fld, obj[fld]);
                        continue;
                    }
                    else {
                        var field = div.div(".json-field");
                        field.textContent = obj[fld] + "";
                    }
                }
                field.set("@field", fld);
            }
            return div;
        };

        J.EndProcess = function (element, context) {
            J.info("jasp-end", element.ToString(), context.id);
            element.rcs("jasp-processing-" + context.ContextId);
            element.cls("jasp-processed-" + context.ContextId);
        };

        J.IdToWinContext = {Condition: "ui-processing"};
        J.IdToWinContext.Selector = "div[id]";
        J.IdToWinContext.Process = function (element) {
            if (!window[element.id]) {
                window[element.id] = element;
            }
        };
        C.Add(J.IdToWinContext);

        J.MapByIdContext = {Condition: "ui-processing", Selector: "[mapById]"};
        J.MapByIdContext.Process = function (element) {
            var mbId = element.get("@mapById");
            if (element.id) {
                var mappingElem = element.get(mbId);
                if (mappingElem) {
                    mappingElem[element.id] = element;
                }
            }
        };
        C.Add(J.MapByIdContext);

        J.ExtendsContext = {Condition: "ui-processing.ui-clone"};
        J.ExtendsContext.Selector = "[extend]";
        J.ExtendsContext.Process = function (element) {
            var extendObject = element.get("@extend");
            if (!extendObject || extendObject == "") return;
            var objects = extendObject.split(".");
            extendObject = window;
            for (var i = 0; i < objects.length; i++) {
                extendObject = extendObject[objects[i]];
                if (!extendObject) {
                    extendObject = null;
                    return;
                }
            }
            Extend(element, extendObject);
            if (extendObject.initObject) {
                extendObject.initObject.call(element);
            }
        };
        C.Add(J.ExtendsContext);

        J.Commands = ['+', '<', '-', '=', '!'];

        J.ProcessJaspContext = function (element) {
            element.code = J.Compile(element.html());
            element.attr("code", element.code);
            element.cls("compiled");
            //Contexts.ProcessContext(W.Body, context);
        };

        J.JaspContext = {Condition: "module-jasp"};
        J.JaspContext.Selector = "jasp:not(.compiled)";
        J.JaspContext.Process = J.ProcessJaspContext;
        C.Add(J.JaspContext);

        J.Macros = AArray();

        J.Convert = function (obj) {
            var id = null;
            var type = "";
            var tags = "";
            var classes = null;
            var props = {};
            var childs = null;
            var next = null;
            var follow = null;
            for (var item in obj) {
                if (typeof obj[item] != "function") {
                    switch (item.toLowerCase()) {
                        case "id":
                            id = obj[item];
                            break;
                        case "type":
                            type = obj[item];
                            break;
                        case "tags":
                            tags = obj[item];
                            break;
                        case "classes":
                            classes = obj[item];
                            break;
                        case "childs":
                            childs = obj[item];
                            break;//changed from "_childs" to "childs"
                        case "next":
                            next = obj[item];
                            break;
                        case "follow":
                            follow = obj[item];
                            break;
                        default :
                            props[item] = obj[item];
                            break;
                    }
                }
            }
            if (!classes && tags) {
                classes = tags.split(" ");
            }
            if (!next && childs) next = [];
            if (next) next.join(childs);
            var selector = type + (id ? "#" + id : "");
            for (var i = 0; i < classes.length; i++) {
                selector += "." + classes[i];
            }
            tags = tags.trim().split(" ");
            for (var i = 0; i < tags.length; i++) {
                if (!selector.contains("." + tags[i])) {
                    selector += "." + tags[i];
                }
            }
            ;
            for (var item in props) {
                selector += '@' + item + '=' + props[item];
            }
            if (childs || next || follow) {
                if (childs.length > 0) {
                    if (childs.length > 1) {
                        selector += "/(";
                        for (var i = 0; i < childs.length; i++) {
                            selector += J.Convert(childs[i]);
                            if (i < childs.length - 1) selector += ",";
                        }
                        selector += ")";
                    }
                    else {
                        selector += "/" + J.Convert(childs[0]);
                    }
                }
                if (next.length > 0) {
                    if (childs.length > 1) {
                        selector += "/(";
                        for (var i = 0; i < next.length; i++) {
                            selector += J.Convert(next[i]);
                            if (i < next.length - 1) selector += ",";
                        }
                        selector += ")";
                    }
                    else {
                        selector += "/" + J.Convert(next[0]);
                    }
                }
                if (follow.length > 0) {
                    if (childs.length > 1) {
                        selector += " (";
                        for (var i = 0; i < follow.length; i++) {
                            selector += J.Convert(follow[i]);
                            if (i < follow.length - 1) selector += ",";
                        }
                        selector += ")";
                    }
                    else {
                        selector += "/" + J.Convert(follow[0]);
                    }
                }
            }
            return selector;
        };

        J.Compile = function (code) {
            var compiledCode = "";
            var lines = code.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var index = -1;
                for (var c = 0; c < J.Commands.length; c++) {
                    var ind = line.indexOf(J.Commands[c]);
                    if (ind >= 0 && (ind < index || index < 0)) {
                        index = ind;
                        var command = J.Commands[c];
                    }
                }
                if (index >= 0) {
                    var left = line.substring(0, index);
                    var right = J.Compile(line.substring(index + 1));
                    if (left.length > 0) {
                        if (left.search(/^\s*[.#]/) >= 0) {
                            compiledCode += "var elem = W.findAll('" + left + "');";
                            switch (command) {
                                case "<":
                                    compiledCode += "elem.html(" + right + ");";
                                    break;
                                case "+":
                                    compiledCode += "elem._add(" + right + ");";
                                    break;
                            }
                            continue;
                        }
                        if (line.search(/^\s*[!]/) >= 0) {

                            switch (command) {
                                case "<":
                                    compiledCode += "window." + left.raplace('!', "").trim() + "(" + right + ");";
                                    break;
                                case "+":
                                    compiledCode += "J.CallParams._add(" + right + ");";
                                    break;
                            }
                            continue;
                        }

                        if (command == "=") {
                            compiledCode += "J.Macros._add(" + left.replace('!', '') + ");";
                            continue;
                        }
                        switch (command) {
                            case "<":
                                compiledCode += left + "=" + right + ";";
                                break;
                            case "+":
                                compiledCode += left.trim() + "._add(" + right + ");";
                                break;
                        }
                    }
                }
                else {
                    if (line.search(/^\s*[!]/) >= 0) {
                        compiledCode += "window." + left + "(J.CallParams); J.CallParams.clear();";
                    }
                    if (left.search(/^\s*[.#]/) >= 0) {
                        compiledCode += "W.findAll('" + left + "')";
                    }
                }
            }
            return compiledCode;
        }

        L.LogInfo("JASP Contexts registered!");
    }
    else {
        L.LogError("Reinitilizing JASP!");
    }

    Config = {
        Server: {
            SessionStorageUrl: "http://storage.web-manufacture.net/Session/",
            UserStorageUrl: "http://storage.web-manufacture.net/User/",
            SiteStorageUrl: "http://storage.web-manufacture.net/Site/",
            ServerStorageUrl: "http://storage.web-manufacture.net/"
        },
        authUrl: "http://security.web-manufacture.net"
    }
    if (!UsingDOM("KLabNet")) (function () {

        KLabNet = {
            Tunnels: {}
        };

        Net = NET = _klabNetInternal = {
            GetTunnel: function (serverUrl) {
                return new KLabTunnel(serverUrl);
            }
        };

        function HttpChannel(url, read) {
            this.url = url;
            EV.CreateEvent("onRead", this);
            if (read) {
                if (typeof read == "function") {
                    this.onRead.subscribe(read);
                }
                this.connectRead(read);
            }
        };

        HttpChannel.prototype = {
            connectRead: function (callback) {
                var url = this.url;
                if (typeof url == "string") {
                    url = new Url(url);
                }
                //url.addParam("rnd", Math.random());
                var rq = _klabNetInternal.GET(url);
                rq.lastStateChar = 0;
                rq.channel = this;
                rq.onreadystatechange = this.readStateChanged;
                rq.send();
            },

            write: function (messages) {
                var url = new Url(this.url + url);
                url.addParam("rnd", Math.random());
                var rq = _klabNetInternal.POST(url, messages);
                rq.send(messages);
            },

            send: function (url, data) {
                if (!url) url = "";
                if (!data) data = null;
                url = new Url(this.url + url);
                url.addParam("rnd", Math.random());
                var rq = _klabNetInternal.POST(url, data);
                rq.send(data);
            },

            readStateChanged: function () {
                var channel = this.channel;
                if (this.readyState == 3) {
                    var result = this.responseText.substr(this.lastStateChar);
                    this.lastStateChar = this.responseText.length;
                    if (result && result.length > 0 && this.status == 200) {
                        result = result.split("\n");
                        for (var i = 0; i < result.length; i++) {
                            if (result[i] == "") continue;
                            try {
                                var value = JSON.parse(result[i]);
                            }
                            catch (e) {
                                continue;
                            }
                            channel.processMessages(value);
                        }
                    }
                }
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        setTimeout(function () {
                            channel.connectRead();
                        }, 500);
                    }
                    else {
                        setTimeout(function () {
                            channel.connectRead();
                        }, 5000);
                    }
                }
            },

            processMessages: function (messages) {
                this.onRead.fire(messages);
            }
        };

        Net.HMCH = function (url, dstChannel, srcChannel) {
            this.url = url;
            if (typeof url == "string") {
                this.url = new Url(url);
            }
            this.channels = {};
            this.remotePaths = [];
            var self = this;
            if (srcChannel || dstChannel) {
                self.bind(dstChannel, srcChannel, "remote");
            }
            this.reconnect(200);
        };

        Net.HMCH.prototype = {
            reconnect: function (timeout) {
                if (this.currentRequest) {
                    this.currentRequest.aborting = true;
                    this.currentRequest.abort();
                    this.currentRequest = null;
                }
                if (this.reconnectTimeout) {
                    clearTimeout(this.reconnectTimeout);
                }
                var self = this;
                this.reconnectTimeout = setTimeout(function () {
                    self.currentRequest = self.connect(self.url);
                    delete self.reconnectTimeout;
                }, timeout);
            },

            connect: function (url, callback) {
                //url.addParam("rnd", Math.random());
                var rq = _klabNetInternal._getRequest("POST", url);
                rq.lastStateChar = 0;
                rq.hmch = this;
                rq.callback = callback;
                rq.onload = null;
                rq.onerror = null;
                rq.setRequestHeader("request-type", "channel");
                rq.onreadystatechange = this._readStateChanged;
                rq.send(JSON.stringify(this.remotePaths));
                return rq;
            },

            _writeMessage: function (messages) {
                var rq = _klabNetInternal._getRequest("PUT", this.url);
                rq.setRequestHeader("request-type", "channel");
                rq.send(JSON.stringify(messages));
            },

            sendMessages: function (messages) {
                if (typeof messages == 'object' && messages.length) {
                    this._writeMessage(JSON.stringify(messages));
                }
            },

            _readStateChanged: function () {
                var self = this.hmch;
                if (this.readyState == 2) {
                    if (this.callback) {
                        setImmediate(this.callback);
                    }
                }
                if (this.readyState == 3) {
                    var result = this.responseText.substr(this.lastStateChar);
                    this.lastStateChar = this.responseText.length;
                    if (result && result.length > 0 && this.status == 200) {
                        result = result.split("\n");
                        for (var i = 0; i < result.length; i++) {
                            if (result[i] == "") continue;
                            try {
                                var value = JSON.parse(result[i]);
                            }
                            catch (e) {
                                console.log(result[i]);
                                continue;
                            }
                            self._processMessage(value);
                        }
                    }
                }
                if (this.readyState == 4) {
                    if (!this.aborting) {
                        if (this.status == 200) {
                            self.reconnect(500);
                        }
                        else {
                            self.reconnect(5000);
                        }
                    }
                }
            },

            _processMessage: function (args) {
                if (!args || !args.length) return;
                var params = [];
                var message = args[0];
                for (var i = 0; i < args.length - 1; i++) {
                    params.push(args[i]);
                }
                var ch = this.channels[message.source];
                if (ch) {
                    Channels.emit(ch, params)
                }
                else {
                    message = Channel.ParsePath(message.source);
                    for (var item in this.channels) {
                        if (message.is(item)) {
                            var innerCh = this.channels[item];
                            ch = Channel.ParsePath(innerCh, message.source);
                            ch.remote = true;
                            Channels.emit(ch, params)
                        }
                    }
                }
            },

            bind: function (remoteChannel, localChannel, directions) {
                if (!localChannel) localChannel = "/";
                if (!remoteChannel) remoteChannel = "/";
                if (!directions) directions = {local: true, remote: true};
                if (typeof (directions) == "string") {
                    switch (directions) {
                        case "both" :
                            directions = {local: true, remote: true};
                            break;
                        case "remote" :
                            directions = {local: false, remote: true};
                            break;
                        case "local" :
                            directions = {local: true, remote: false};
                            break;
                    }
                }
                if (directions.remote) {
                    this.remotePaths.push(remoteChannel);
                    this.channels[remoteChannel] = localChannel;
                    this.reconnect(100);
                }
                var self = this;
                if (directions.local) {
                    Channels.on(localChannel, function (message) {
                        try {
                            if (!this.remote) {
                                var params = [];
                                for (var i = 1; i < arguments.length; i++) {
                                    params.push(arguments[i]);
                                }
                                message.args = params;
                                self._writeMessage(message);
                            }
                        }
                        catch (e) {
                            console.log(e);
                        }
                    });
                }
            },

            subscribe: function (remoteChannel, localChannel) {
                return this.bind(remoteChannel, localChannel, "remote");
            },

            follow: function (remoteChannel, localChannel) {
                return this.bind(remoteChannel, localChannel, "local");
            },

        };


        function ServerTunnel(url, isFullDuplex) {
            this.url = url;
            if (isFullDuplex) {
                this.connect();
            }
        };

        ServerTunnel.prototype = {
            Init: function () {
                EV.CreateEvent("OnMessage", this);
            },

            connect: function () {
                var url = this.url;
                if (typeof url == "string") {
                    url = new Url(url);
                }
                //url.addParam("rnd", Math.random());
                var rq = _klabNetInternal.POST(url);
                rq.lastStateChar = 0;
                rq.tunnel = this;
                rq.onreadystatechange = this.stateChanged;
                rq.send();
            },

            stateChanged: function () {
                var tunnel = this.tunnel;
                if (this.readyState == 3) {
                    _klabNetInternal.Online = true;
                    _klabNetInternal.OnConnectionState.fire(true);
                    if (tunnel.onConnected) {
                        tunnel.onConnected();
                    }
                    var result = this.responseText.substr(this.lastStateChar);
                    this.lastStateChar = this.responseText.length;

                    if (result && result.length > 0 && this.status == 200) {
                        result = JSON.parse(result);
                        tunnel.processMessages(result);
                    }
                }
                if (this.readyState == 4) {

                    if (this.status == 200) {
                        setTimeout(function () {
                            tunnel.connect();
                        }, 500);
                    }
                    else {
                        _klabNetInternal.Online = false;
                        _klabNetInternal.OnConnectionState.fire(false);
                        setTimeout(function () {
                            tunnel.connect();
                        }, 5000);
                    }
                }
            },

            processMessages: function (messages) {
                if (messages.length) {
                    for (var i = 0; i < messages.length; i++) {
                        this.OnMessage.fire(messages[i]);
                    }
                }
                else {
                    this.OnMessage.fire(messages);
                }
            }
        };


        function KLabTunnel(url, isPermanent) {
            if (!url) {
                this.TunnelUrl = null; //Url.Resolve(window.location.protocol + "//" + window.location.host);
                this.ServerUrl = "";
            }
            else {
                this.TunnelUrl = url;//new Url(serverUrl, true);
                this.ServerUrl = (new Url(url, true)) + "";
                //this.crossDomain = this.ServerUrl.hostname != window.location.hostname;
            }
            if (isPermanent) {
                this._createServerTunnel();
            }
        };


        KLabTunnel.prototype = {
            _endRequest: function () {
                if (this.callback) {
                    var contentType = this.getResponseHeader("Content-Type");
                    this.contentType = contentType;
                    if (typeof(this.callback) == "function") {
                        var result = this.responseText;
                        if (!this.preventParsing && contentType && (contentType.start("text/json") || contentType.start("application/json"))) {
                            try {
                                result = JSON.parse(result);
                            }
                            catch (e) {
                                this.callback(this.responseText, this.status);
                                return;
                            }
                        }
                        this.callback(result, this.status);
                        return;
                    }
                    if (this.callback.add) {
                        if (DOM) {
                            this.callback.add(DOM.Wrap(this.responseText));
                        }
                        else {
                            this.callback.add(this.responseText);
                        }
                        return;
                    }
                    delete this.callback;
                }
            },

            _createServerTunnel: function () {
                if (KLabNet.Tunnels[this.ServerUrl]) {
                    this.serverTunnel = KLabNet.Tunnels[this.ServerUrl];
                }
                else {
                    this.serverTunnel = KLabNet.Tunnels[this.ServerUrl] = new ServerTunnel(this.ServerUrl, true);
                }
                this.serverTunnel.Init();
                EV.CreateEvent("OnConnected", this);
                var tunnel = this;
                this.serverTunnel.onConnected = function () {
                    tunnel.OnConnected.fire();
                }
            },


            _errorRequest: function () {
                if (this.callback) {
                    if (typeof(this.callback) == "function") {
                        this.callback(this.responseText, this.status);
                        return;
                    }
                }
            },

            _getRequest: function (method, url, callback, preventParsing) {
                var rq = new XMLHttpRequest();
                if (this.TunnelUrl && typeof(url) == "string") {
                    url = this.TunnelUrl + url;
                }
                rq.preventParsing = preventParsing;
                rq.id = (Math.random() + "").replace("0.", "");
                if (typeof url == 'string') url = new Url(url);
                url = url + "";
                rq.open(method, url, true);
                rq.callback = callback;
                rq.onload = this._endRequest;
                rq.onerror = this._errorRequest;
                return rq;
            },

            _sendRequest: function (method, url, data, callback, preventParsing) {
                if (typeof(url) == "function") {
                    callback = url;
                    url = "";
                }
                var rq = this._getRequest(method, url, callback, preventParsing);
                if (callback) {
                    rq.send(data);
                }
                return rq;
            },


            get: function (url, data, callback, preventParsing) {
                if (!callback && typeof data == "function") {
                    callback = data;
                    data = null;
                }
                {
                    return this._sendRequest("GET", url, data, callback, preventParsing);
                }
            },

            all: function (url, data, callback, preventParsing) {
                if (!callback && typeof data == "function") {
                    callback = data;
                    data = null;
                }
                return this._sendRequest("SEARCH", url, data, callback, preventParsing);
            },

            add: function (url, data, callback, preventParsing) {
                if (!callback && typeof data == "function") {
                    callback = data;
                    data = null;
                }
                {
                    return this._sendRequest("POST", url, data, callback, preventParsing);
                }
            },

            set: function (url, data, callback, preventParsing) {
                if (!callback && typeof data == "function") {
                    callback = data;
                    data = null;
                }
                {
                    return this._sendRequest("PUT", url, data, callback, preventParsing);
                }
            },

            del: function (url, data, callback, preventParsing) {
                if (!callback && typeof data == "function") {
                    callback = data;
                    data = null;
                }
                else {
                    if (typeof(data) != 'string') data = JSON.stringify(data);
                }
                {
                    return this._sendRequest("DELETE", url, data, callback, preventParsing);
                }
            }
        };

        KLabTunnel.prototype.Gdd = KLabTunnel.prototype.GET = KLabTunnel.prototype.get;
        KLabTunnel.prototype.Add = KLabTunnel.prototype.POST = KLabTunnel.prototype.add;
        KLabTunnel.prototype.All = KLabTunnel.prototype.SEARCH = KLabTunnel.prototype.browse = KLabTunnel.prototype.all;
        KLabTunnel.prototype.Set = KLabTunnel.prototype.PUT = KLabTunnel.prototype.set;
        KLabTunnel.prototype.Del = KLabTunnel.prototype.DELETE = KLabTunnel.prototype.del;

        for (var item in KLabTunnel.prototype) {
            Net[item] = KLabTunnel.prototype[item];
        }

        Net.POST = Net.add;
        Net.GET = Net.get;
        Net.DELETE = Net.del;
        Net.PUT = Net.set;
        Net.SEARCH = Net.all;

        Net.bindChannel = function (url, remoteChannel, localChannel) {
            if (window.Channels && url) {
                if (!localChannel) localChannel = "/";
                if (!remoteChannel) remoteChannel = "/";
                if (remoteChannel.start("/")) {
                    remoteChannel = remoteChannel.replace("/", "");
                }
                url = new Url(url);
                if (url.pathname.ends("/")) {
                    url.pathname += remoteChannel;
                }
                else {
                    url.pathname += "/" + remoteChannel;
                }

                if (window.io) {

                }
                else {
                    var httpChannel = new HttpChannel(url, function (messages) {
                        if (messages && messages.length) {
                            var message = messages[0];
                            if (message && message.source) {
                                message = messages[0] = localChannel + message.source;
                            }
                            message = messages[0] = Channel.ParsePath(message);
                            message.remote = true;
                            Channels.emit.apply(Channels, messages);
                        }
                    });
                    Channels.on(localChannel, function (message) {
                        try {
                            if (!this.remote) {
                                var params = [];
                                for (var i = 0; i < arguments.length; i++) {
                                    params.push(arguments[i]);
                                }
                                httpChannel.write(JSON.stringify(params) + "\n");
                            }
                        }
                        catch (e) {
                            console.log(e);
                        }
                    });
                    return httpChannel;
                }
            }
        }

        Net.Online = false;
        WS.DOMload(function () {
            EV.CreateEvent("OnConnectionState", Net);
        });
    })();
    if (!UsingDOM("Modules")) {
        M = Modules;

        M.id = 'Modules_Container';

        M.url = "modules.js";

        M.info = L.Info;
        M.error = L.Error;

        M.Context = {};

        ServicesUrl = M.ServicesUrl = window.ServicesUrl ? ServicesUrl : "http://services.web-manufacture.net";
        SystemUrl = M.SystemUrl = window.SystemUrl ? SystemUrl : "http://system.web-manufacture.net";
        ModulesUrl = M.ModulesUrl = window.ModulesUrl ? ModulesUrl : "http://modules.web-manufacture.net";

        M.Namespaces = {
            services: {
                url: M.ServicesUrl
            },
            system: {
                url: M.SystemUrl
            },
            ui: {
                url: M.ServicesUrl
            }
        };

        M.Init = function () {
            //WS.Body.appendChild(M);
            M.info("initialized", M.url);
            EV.CreateEvent("OnModuleRegistered", M, true);
            EV.CreateEvent("OnModuleLoad", M);
            EV.CreateEvent("OnModuleLoaded", M);
            EV.CreateEvent("OnModulesLoaded", M);
            if (window.DFC_ModulesLoaded != undefined) {
                EV.AddHandler("OnModulesLoaded", window.DFC_ModulesLoaded, "modules");
            }
            C.Add(M.WaitContext);
            C.Add(M.ParsingIncludeContext);
            C.Add(M.ParsingUrlScriptContext);
            C.Add(M.ParsingScriptContext);
            C.Add(M.ParsingLinkContext);
            C.Add(M.ParsingStyleContext);
            C.Add(M.DefferedScriptContext);
            M.SearchModules(WS.Body);
        };

        M.GetModuleStatus = function (url) {
            var mod = DOM.aget("url", url, ".module");
            if (mod == null) return "notfound";
            if (mod._is(".inprogress")) return "inprogress";
            if (mod._is(".processed")) return "processed";
            return "unknown";
        };

        M.prepareUrl = function (url, doNotConvert) {
            if (!url) return null;
            if (!doNotConvert) url = url.toLowerCase();
            url = url.replace("%modules%", M.ModulesUrl);
            for (var ns in M.Namespaces) {
                var namespace = M.Namespaces[ns];
                if (namespace.url) {
                    url = url.replace("%" + ns + "%", namespace.url);
                }
            }
            return url;
        }

        M.registerNamespace = function (name, url) {
            M.Namespaces[name] = {url: url};
        }

        M.GetModuleByUrl = function (url) {
            return M.aget("url", M.prepareUrl(url), ".module");
        };

        M.GetModuleContainsUrl = function (url) {
            return M._get(".module[url*='" + M.prepareUrl(url) + "']", ".module");
        };

        M.GetModuleEndsUrl = function (url) {
            return M._get(".module[url$='" + M.prepareUrl(url) + "']", ".module");
        };

        M.SubscribeTo = function (url, handler) {
            url = M.prepareUrl(url);
            var modl = M.GetModuleByUrl(url);
            if (!modl || modl._is(".inprogress")) {
                M.OnModuleRegistered.subscribe(handler);
                return false;
            }
            handler(url, modl);
        };

        M.CreateModule = function (url, state) {
            url = M.prepareUrl(url);
            var module = M._div(".module");
            module._add("." + state);
            url = url.toLowerCase();
            module.url = url;
            module._set("@url", module.url);
            module.isScript = url.ends(".js");
            var url = Request.ParseUrl(url);
            module.id = (url.file ? url.file : url.host).replace(/\./g, "_");
            return module;
        };


        M.SearchModules = function (elem) {
            var url = "Body";
            var nfo = DOM._get("module-info");
            if (nfo != null) {
                url = nfo.attr("url");
            } else {
                url = WS.Body.attr("url");
                if (url == null) {
                    if (check(Request.File) && Request.File != "") {
                        url = Request.File;
                    } else {
                        url = "Body";
                    }
                }
            }
            url = M.prepareUrl(url);
            var module = M.CreateModule(url, "inprogress");

            /*var scripts = WS.Body._all("script.deffered");
for(var i = 0; i < scripts.length; i++){
WS.Header._add(scripts[i]);
}*/

            var includes = elem._all("script[url]");
            for (var i = 0; i < includes.length; i++) {
                if (includes[i].parentNode == elem)
                    module._add(includes[i]);
            }
            var includes = elem._all("include");
            for (var i = 0; i < includes.length; i++) {
                includes[i]._add(".include");
                if (includes[i].parentNode == elem)
                    module._add(includes[i]);
            }
            M.OnModuleRegistered.subscribe(M.BodyLoaded, url);
            M.ParseModule(module);
        };

        M.BodyLoaded = function (url, module) {
            //M.OnModuleRegistered.unsubscribe(M.BodyLoaded, url);
            M.info("finishing");
            C.Process(WS.Body, "ui-processing");
            M.modulesLoaded = true;
            M.OnModulesLoaded.fire(url, module);
            return "del";
        };

        M.ParseModule = function (module) {
            var result = true;
            try {
                if (module._is(".processed")) {
                    M.info("parse", "reprocess", module.attr("url"));
                    return true;
                }
                if (!module.id) {
                    module.id = "Module" + Math.round(Math.random() * 100000000000);
                }
                module.cls("inprogress");
                var type = module.attr("type");
                module.moduleType = type;
                /*if (module.childNodes.length == 1 && module.firstNode.tagName == 'DIV'){
				var fnode =  module.firstNode;
				if (fnode.id){
					module.id = fnode.id;
				}
			}*/
                C.Process(module, "module-parsing", " Parsing: " + module.url);
                result &= M.CheckModule(module, "Parsing " + module.url);
            } catch (e) {
                L.LogError(e, " Parsing: " + module.url, "modules module parsing");
            }
            return result;
        };

        M.LoadScriptInternal = function (ourl, module, cmod, cache) {
            var script = M.CreateScript(ourl, cache);
            script.cls("created");
            if (module != null) {
                module._add(script);
                script._set("@module-id", module.id);
            }
            else {
                M._add(script);
            }
            M.info("load-script", script.url, " from ", cmod);
            return script;
        };

        M.ScriptExists = function (ourl) {
            var cmod = "";
            if (ourl == undefined || ourl == null) return null;
            var selector = "script.loaded[src='1'], script.processed[src='1']";
            //проверка в оригинальном регистре
            var docScript = DOM._get(selector.replace(/1/g, ourl));
            if (docScript != null) {
                L.LogWarn("M.ScriptExists rescript: " + ourl + " FROM: " + cmod, M.url);
                return docScript;
            }
            //проверка в малом регистре
            var url = M.prepareUrl(ourl);
            var docScript = DOM._get(selector.replace(/1/g, url));
            if (docScript != null) {
                L.LogWarn("M.ScriptExists rescript: " + url + " FROM: " + cmod, M.url);
                return docScript;
            }
            //проверка в малом регистре на загружающиеся скрипты
            selector = "script.inprogress[src='1']";
            var docScript = DOM._get(selector.replace(/1/g, url));
            if (docScript != null) {
                L.LogWarn("M.ScriptExists inprogress: " + url + " FROM: " + cmod, M.url);
                return docScript;
            }
            return null;
        };

        M.CreateScript = function (ourl, cache) {
            var url = M.prepareUrl(ourl);
            var surl = M.prepareUrl(ourl, true);
            if (window.AX && AX.CrossDomain) surl = AX.SystemRoot + surl;
            if (Request.Params.cache == "nocache") {
                cache = true;
            }
            if (cache) surl += '?rnd=' + Math.random();

            var scriptElement = document.createElement("script");
            scriptElement.attr("type", "text/javascript");
            scriptElement.attr("class", "module-script inprogress");
            scriptElement.attr("url", url);
            scriptElement.attr("src", surl);
            scriptElement.url = url;
            scriptElement.onload = M.scriptLoaded;
            scriptElement.onerror = function () {
                console.error("SCRIPT " + url + " loading error!");
                M.scriptLoaded.call(scriptElement);
            }
            /*M.waitScript(scriptElement, function(){
			M.scriptLoaded.call(scriptElement);
		});*/
            return scriptElement;
        };

        M.LoadScript = function (ourl, from, cache) {
            var url = M.prepareUrl(ourl);
            if (url.ends(".js")) {
                var scriptModule = M.ScriptExists(url);
                if (scriptModule) {
                    return scriptModule;
                }
                ;
                scriptModule = M.CreateModule(ourl, "inprogress");
                var result = M.LoadScriptInternal(ourl, scriptModule, from, cache);
                return scriptModule;
            }
            return null;
        };


        M.scriptLoaded = function (event, code) {
            if (!this.is(".loaded")) {
                this.rcs("inprogress");
                this.rcs("created");
                this.cls("loaded");
                this.cls("processed");
                if (!this.local) {
                    //var item = globalStorage['system.web-manufacture.net'].setItem("module:" + this.url, code);
                }
                var modId = this._get("@module-id");
                if (modId) {
                    var module = document.getElementById(modId);
                }
                else {
                    var module = this._get("^.module");
                }
                M.info("script-load", this.url, " from ", module ? module.url : undefined);
                if (module) {
                    M.CheckModule(module, "script: " + this.url);
                }
            }
            ;
        };

        M.waitScript = function (script, callback) {
            if (script.is(".loaded")) return;
            var txt = script.text;
            var event = script.event;
            if (txt) {
                callback();
            }
            else {
                setTimeout(function () {
                    M.waitScript(script, callback);
                }, 20);
            }
        };

        M.Load = function (ourl, from, cache) {
            var url = M.prepareUrl(ourl);
            if (url.ends(".js")) {
                return M.LoadScript(ourl, from, cache);
            }
            else {
                return M.LoadModule(ourl, null, from, cache);
            }
        };

        M.LoadModule = function (ourl, module, cmod, cache) {
            if (ourl == undefined || ourl == null) return;
            var url = M.prepareUrl(ourl);
            var requestUrl = M.prepareUrl(ourl, true);
            if (module == undefined || module == null) {
                module = M.GetModuleByUrl(url);
                if (module != null) {
                    if (module._is(".inprogress")) {
                        L.LogWarn("inprogress: " + url + " FROM: " + cmod, M.url);
                    }
                    if (module._is(".processed")) {
                        L.LogWarn("reincluding: " + url + " FROM: " + cmod, M.url);
                    }
                    return module;
                }
                else {
                    M.info("mod-create", ourl, " from ", cmod);
                    module = M.CreateModule(url, "inprogress");
                    module.cls("created");
                }
            }
            module.from = cmod;
            M.info("load-module", url, " from ", cmod);
            M.OnModuleLoad.fire(module.url.toLowerCase(), module);
            if (window.SysAjax) {
                SysAjax.LoadModule(requestUrl, module, cache, M.moduleLoaded);
            }
            else {
                var rq = new XMLHttpRequest();
                rq.open("GET", requestUrl + "", true);
                rq.onload = function () {
                    M.moduleLoaded.call(this, this.responseText);
                };
                rq.module = module;
                rq.send();
            }
            return module;
        };


        M.moduleLoaded = function (result) {
            var module = this.module;
            try {
                module.rcs("created");
                module.cls("loaded");
                //var item = globalStorage['system.web-manufacture.net'].setItem("module:" + req.file, req.responseText);
                M.info("modul-load", module.url, " from ", module.from);
                var data = this.responseText;
                var exp = /(<script[^>]+)src=/ig;
                if (exp.test(data)) {
                    L.LogWarn(M.id + ":" + " regexing : scripts injection from : " + module.url, M.url);
                    data = data.replace(exp, "$1 url=");
                }
                var exp = /(<link[^>]+)href=/ig;
                if (exp.test(data)) {
                    data = data.replace(exp, "$1 url=");
                    L.LogWarn("style injection:  from: " + this.file, M.url);
                }
                /*if (data.contains("<module")){
var mod = DOM._div();
mod.html(data);
mod = mod._get("module");
if (mod != null){
module.attr("title", mod.attr("title"));
data = mod.html();
}
}*/

                if (module.url.toLowerCase().endsWith(".css")) {
                    module.html('<style type="text/css">' + data + "</style>");
                }
                else {
                    module.html(data);
                }
                M.OnModuleLoaded.fire(module.url.toLowerCase(), module);
            }
            catch (e) {
                L.LogError(e, "System.Modules.js : moduleLoaded: " + module.url, "System.Modules.js");
            }
            M.ParseModule(module);
        };

        M.WaitContext = {Selector: "wait:not(.inprogress):not(.processed)", Condition: "module-parsing"};

        M.WaitContext.Process = function (element, context, module, from) {
            var url = element.attr("url");
            if (url != null) {
                if (element._is(".inprogress")) return false;
                url = M.prepareUrl(url);
                element.url = url;
                element.attr("url", url);
                if (M.GetModuleStatus(url) == "processed") {
                    M.info("wait_accept", module.url, " for ", module.wait);
                    element.cls("processed");
                    return true;
                }
                else {
                    module.wait = url;
                    M.info("waiting", module.url, " for ", module.wait);
                    M.OnModuleRegistered.subscribe(M.ProcessWait, url);
                }
                element.cls('inprogress');
                return false;
            }
            return true;
        };

        M.ProcessWait = function (url, module) {
            url = M.prepareUrl(url);
            if (!module) {
                module = M.GetModuleByUrl(url);
            }
            var waits = M._all("wait[url='" + url + "']");
            for (var i = waits.length - 1; i >= 0; i--) {
                var wait = waits[i];
                wait.rcs("inprogress");
                wait.cls("processed");
                module = waits[i]._get("^.module");
                if (module) {
                    M.info("wait_end", module.url, " for ", module.wait);
                    module.wait = null;
                    M.ParseModule(module);
                }
                else {
                    M.error("wait_end", url, " from wait ", wait.url);
                }
            }
            return "del";
        };


        M.ParsingUrlScriptContext = {
            Selector: "script:not(.inprogress):not(.processed)[url],script:not(.inprogress):not(.processed)[src]",
            Condition: "module-parsing"
        };

        M.ParsingUrlScriptContext.Process = M.ProcessUrlScript = function (script, context, module, from) {
            if (module.wait) return false;
            var url = script.attr("url");
            if (!url) {
                url = script.attr("src");
            }
            if (url != null) {
                if (script._is(".inprogress")) return false;
                script._del();
                var exists = M.ScriptExists(url);
                if (exists) return false;
                M.LoadScriptInternal(url, module, from);
            }
            return true;
        };


        M.ParsingScriptContext = {
            Selector: "script:not(.inprogress):not(.processed):not([url]):not(.deffered)",
            Condition: "module-parsing"
        };

        M.ParsingScriptContext.Process = M.ProcessScript = function (script, context, module, from) {
            if (module.wait) return false;
            if (script._is(".deffered")) return true;
            M.info("script-exec", module.url, " from ", from);
            try {
                var result = EvalInContext(script.innerHTML, module);
                if (!module.evaledScripts) module.evaledScripts = [];
                module.evaledScripts.push(script.innerHTML);
                if (!module.scriptResults) module.scriptResults = [];
                module.scriptResults.push(result);
            }
            catch (e) {
                e.fileName = module.url;
                L.LogError(e, module.url);
            }
            return true;
        };


        M.DefferedScriptContext = {
            Selector: "script.deffered:not(.inprogress):not(.processed)",
            Condition: "module-post-registered"
        };

        M.DefferedScriptContext.Process = M.ProcessDeffered = function (element, context, module, from) {
            if (module.wait) return false;
            M.info("Deffered", module.url, 'script', element.ToString());
            window.eval(element.innerHTML);
            element.cls("processed");
            return true;
        };


        M.ParsingLinkContext = {Selector: "link:not(.inprogress):not(.processed)[url]", Condition: "module-parsing"};

        M.ParsingLinkContext.Process = M.ProcessStyle = function (element, context, module, from) {
            if (module.wait) return false;
            if (element._is("link")) {
                var url = element.attr("url");
                if (url == null) return true;
                var lnk = DOM.aget("href", url, 'link');
                if (lnk == null) {
                    element.attr("href", url);
                    WS.Header._add(element);
                }
                else {
                    element.cls("rescript");
                    element.cls("processed");
                }
            }
            return true;
        };

        M.ParsingStyleContext = {Selector: "style:not(.inprogress):not(.processed)", Condition: "module-parsing"};

        M.ParsingStyleContext.Process = M.ProcessStyle = function (element, context, module, from) {
            if (module.wait) return false;
            element.cls(".processed");
            return true;
        };

        M.ParsingIncludeContext = {Selector: "include:not(.inprogress):not(.processed)", Condition: "module-parsing"};

        M.ParsingIncludeContext.Process = M.ProcessInclude = function (element, context, module, from) {
            if (module.wait) return false;
            element.url = element.attr("url");
            element.aurl = element.attr("alt");
            if (Check(element.aurl)) {
                var mod = M.GetModuleByUrl(element.aurl);
                if (mod != null) {
                    L.LogWarn("alt-using: " + element.aurl + " not: " + element.url + " FROM: " + module.url, M.url);
                    element.url = element.aurl;
                    element.attr("url", element.url);
                }
            }
            var url = "body";
            if (Check(module)) {
                url = module.url;
            }
            var result = M.Load(element.url, module.url, null);
            element.url = M.prepareUrl(element.url);
            element.setAttribute("url", element.url);
            if (result && result._is(".inprogress")) {
                element.cls("inprogress");
                M.info("include-run", element.url, " from ", url);
            }
            else {
                element.cls("processed");
                M.info("include-stop", element.url, " from ", url);
            }
            return true;
        };


        M.CheckModule = function (module, from) {
            M.info("checking", module.url, " from ", from);
            if (module.wait) {
                M.info("waiting", module.url, " for ", module.wait);
                return false;
            }
            var inprogress = module._all(".inprogress");
            if (inprogress.length > 0) {
                M.info("decline", module.url, " count ", inprogress.length, " not checked ", inprogress[0].ToString());
                return false;
            }
            M.info("continue", module.url);
            M.ModuleRegistered(module.url, module);
            M.OnModuleRegistered.fire(module.url, module);
            return true;
        };

        M.ModuleRegistered = function (url, module) {
            url = M.prepareUrl(url);
            M.info("pre-register", url);
            module.rcs("inprogress");
            /*var checks = DOM._all("check.inprogress[url='" + url + "']");
for (var i = 0; i < checks.length; i++) {
checks[i].rcs("inprogress");
var mod = checks[i].findParent("module");
if (mod != null) {
M.CheckModule(mod, url);
}
}*/

            if (!module.isScript) C.Process(module, "module-pre-registered", " registering " + url);
            if (module.Init) {
                module.Init();

            }
            else {
                if (module.init) {
                    module.init();

                }
            }

            if (!module.isScript) {
                C.Process(module, "ui-processing", module);
                if (false) {
                    var elems = module._all(">*:not(.processed):not(.ui-processed):not(.module-element):not(script):not(link):not(style):not(title):not(meta)");
                    for (var i = elems.length - 1; i >= 0; i--) {
                        var elem = WS.Body._add(elems[i]);
                    }
                }
            }
            C.Process(module, "module-post-registered", "registering " + url);
            module.reload = M.Reload;
            module.cls("processed");
            C.Process(module, "module-registered", "registering " + url);
            M.info("registered", url);
            var includings = DOM._all("include.inprogress[url='" + url + "']");
            for (var i = 0; i < includings.length; i++) {
                var inc = includings[i];
                inc.rcs("inprogress");
                inc.cls("processed");
                var mod = inc._get("^.module");
                if (inc.attr("onreg") != null) {
                    eval(inc.attr("onreg"));
                }
                if (mod) {
                    M.CheckModule(mod, url);
                }
            }
            var parent = module._get("^.module.inprogress");
            if (parent) {
                M.CheckModule(parent, url);
            }
        };

        M.Reload = function (random) {
            var url = this.attr('url');
            this._del();
            M.LoadModule(url, null, 'reload', random);
        };

        M.ReloadLinks = function () {
            var links = [];
            DOM.all("link").each(function (lnk) {
                var cln = lnk.clone();
                cln.attr("href", cln.attr("href").contains("?") ? cln.attr("href") + "&rnd=" + Math.random() : cln.attr("href") + "?rnd=" + Math.random());
                links.push(cln);
                lnk.del();
            });
            for (var i = 0; i < links.length; i++) {
                document.head.appendChild(links[i]);
            }
        };

        M.ReloadScripts = function () {
            var links = [];
            DOM.all("script.reloadable").each(function (lnk) {
                var cln = lnk.clone();
                cln.attr("src", cln.attr("src").contains("?") ? cln.attr("src") + "&rnd=" + Math.random() : cln.attr("src") + "?rnd=" + Math.random());
                links.push(cln);
                lnk.del();
            });

            for (var i = 0; i < links.length; i++) {
                document.head.appendChild(links[i]);
            }
        };

        M.WaitModule = function (url, callback) {
            url = M.prepareUrl(url);
            if (M.GetModuleStatus(url) == "processed") {
                callback(url, M.GetModuleByUrl(url));
                return true;
            }
            M.OnModuleRegistered.subscribe(function (modUrl, module) {
                callback(modUrl, module);
                return "del";
            }, url);
            return false;
        };

        WS.DOMload(M.Init);

    }
    else {
        L.LogError("Reinitilizing M (Modules)!");
    }
    if (!UsingDOM("KLabStorage")) {

        SimpleStorage = function (url) {
            this.url = url;
            this.tunnel = new KLabTunnel(url, false);
            if (window.Channel) {
                this.channel = new Channel();
            }
        };

        SimpleStorage.prototype = {
            on: function () {
                return this.channel.on.apply(this.channel, arguments);
            },

            once: function () {
                return this.channel.once.apply(this.channel, arguments);
            },

            emit: function () {
                return this.channel.emit.apply(this.channel, arguments);
            },

            _sendRequest: function (type, data, callback) {
                var storage = this;
                return this.tunnel.POST("?action=" + type, JSON.stringify(data), function (result) {
                    if (callback) {
                        callback.call(this, result, storage);
                    }
                    if (storage.channel) {
                        storage.channel.emit(type + "." + this.id, result);
                    }
                });
            },

            all: function (searchobj, callback) {
                if (!callback && typeof(searchobj) == "function") {
                    callback = searchobj;
                    searchobj = null;
                }
                return this._sendRequest("all", searchobj, callback);
            },

            get: function (searchobj, callback) {
                return this._sendRequest("get", searchobj, callback);
            },

            add: function (dataobj, callback) {
                return this._sendRequest("add", dataobj, callback);
            },


            set: function (dataobj, callback) {
                return this._sendRequest("set", dataobj, callback);
            },

            del: function (dataobj, callback) {
                return this._sendRequest("del", dataobj, callback);
            }
        };

        SimpleStorage.prototype.load = SimpleStorage.prototype.all;

        KLabStorage = {};

        KLabStorage.Init = function () {

        };

        KLabStorage.GetStorage = function (url) {
            return new KLabServerStorage(url);
        };

        function KLabServerStorage(url) {
            this.tunnel = KLabNet.GetTunnel(url);
            this.url = Url.Resolve(url);
        };

        KLabServerStorage.prototype = {
            get: function (path) {
                var klabObj = new KLabStorageAsyncObj(path);
                klabObj._parent = this;
                klabObj._state = KLabObjectStates.INPROGRESS;
                var rq = this.tunnel.get(this._baseUrl + path);
                rq.obj = this;
                rq.callback = function (result, status) {
                    if (result && result.length > 0) {
                        var res = JSON.parse(result);
                        for (var item in res) {
                            if (item == "_id") {
                                klabObj.id = res[item];
                            }
                            else {
                                klabObj[item] = res[item];
                            }
                        }
                        klabObj._synchronize();
                    }
                };
                rq.send();
                return klabObj;
            },

            all: function (path) {
                return new KLabStorageAsyncObj(path);
            },

            add: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            set: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            del: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            each: function (func) {

            }
        };

        KLabObjectStates = {
            CREATED: 0,
            INPROGRESS: 10,
            WAITING: 15,
            SYNCHRONIZED: 20,
        }

        function KLabStorageAsyncObj(path, syncFunc) {
            this._path = path;
            this._syncFunc = syncFunc;
            this._state = KLabObjectStates.CREATED;
        };

        KLabStorageAsyncObj.prototype = {
            _synchronize: function () {
                this._state = KLabObjectStates.SYNCHRONIZED;
                if (typeof(this._onsync) == 'function') {
                    this._onsync();
                }
            },

            sync: function (func) {
                //if (this._state < KLabObjectStates.SYNCHRONIZED
                this._onsync = func;
                this._syncFunc();
            },

            get: function (path) {
                return new KLabStorageAsyncObj(path);
            },

            all: function (path) {
                return new KLabStorageAsyncObj(path);
            },

            add: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            set: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            del: function (obj) {
                return new KLabStorageAsyncObj(obj);
            },

            each: function (func) {

            }
        };

        function KLabCachedStorage(url, readyfunc) {
            var storage = this;
            this._tunnel = new KLabTunnel(url, true);
            this._baseUrl = Url.Resolve(url);
            this.itemsState = localStorage[this._baseUrl + "/_states"];
            if (!this.itemsState) {
                this.itemsState = {};
            }
            else {
                this.itemsState = JSON.parse(this.itemsState);
            }
            EV.CreateEvent("OnObjectChangedAsync", this);
            window.setInterval(function () {
                storage._checkHistory();
            }, 3000);
            EV.CreateEvent("OnServerEvent", this);
            EV.CreateEvent("OnItemStateUpdatedAsync", this);
            this.OnServerEvent.subscribe(function (condition, obj) {
                storage._onAddServerback(obj);
            }, "ADD");
            this.OnServerEvent.subscribe(function (condition, obj) {
                storage._onDelServerback(obj);
            }, "DEL");
            this.OnServerEvent.subscribe(function (condition, obj) {
                storage._onSetServerback(obj);
            }, "SET");
            this._tunnel.OnConnected.subscribe(function (condition, obj) {
                storage._synchronizeCache();
            });
        };

        KLabCachedStorage.prototype = {


            _clearCache: function () {
                this.cache = null;
                localStorage.removeItem(this._baseUrl);
                localStorage.removeItem(this._baseUrl + "/_states");
            },


            _updateServerItem: function (item) {
                item.id = item._id;
                delete item._id;
                return item;
            },


            _saveLocalCache: function () {
                localStorage[this._baseUrl] = JSON.stringify(this.cache);
                localStorage[this._baseUrl + "/_states"] = JSON.stringify(this.itemsState);
            },

            _synchronizeCache: function () {
                if (Net.Online) {
                    for (var item in this.itemsState) {
                        this._synchronizeItem(item, this.cache.get({id: item}));
                    }
                }
            },

            _synchronizeItem: function (id, obj) {
                var storage = this;
                if (this.itemsState[id] == "deleted" && Net.Online) {
                    this._tunnel.del("?id=" + id, function (result) {
                        delete storage.itemsState[id];
                        storage._saveLocalCache();
                    });
                    return;
                }
                if (this.itemsState[id] == "modified" && Net.Online && obj) {
                    this._tunnel.set("?id=" + id, JSON.stringify(obj), function (result) {
                        delete storage.itemsState[id];
                        storage._saveLocalCache();
                    });
                }
                if (this.itemsState[id] == "added" && Net.Online && obj) {
                    delete obj.id;
                    this._tunnel.add("", JSON.stringify(obj), function (result) {
                        if (result) {
                            result = JSON.parse(result);
                            if (result.internalNum) {
                                obj.id = result._id;
                                delete storage.itemsState[obj.id];
                                delete storage.itemsState[result.internalNum];
                                storage._saveLocalCache();
                                storage.OnItemStateUpdatedAsync.fire("ADD", obj)
                            }
                        }
                    });
                }
            },

            _FillItems: function (path, readyFunc) {
                var obj = this;
                this._tunnel.all(path, function (result) {
                    if (result && result.length > 0) {
                        obj.cache = JSON.parse(result);
                        for (var i = obj.cache.length - 1; i >= 0; i--) {
                            var item = obj.cache[i];
                            if (!item._id) {
                                obj.cache.splice(i, 1);
                                continue;
                            }
                            if (item._id == "000000000000000000000000") {
                                localStorage[obj._baseUrl + "/_history"] = item.counter;
                                obj.cache.splice(i, 1);
                                continue;
                            }
                            obj._updateServerItem(item);
                        }
                        obj._saveLocalCache();
                    }
                    else {
                        obj.cache = [];
                        obj._saveLocalCache();
                    }
                    if (readyFunc) {
                        readyFunc.call(obj, obj.cache);
                    }
                });
                return this;
            },

            _checkHistory: function () {
                if (Net.Online && this.cache) {
                    this._synchronizeCache();
                    var lh = localStorage[this._baseUrl + "/_history"];
                    if (lh) {
                        var rq = this._tunnel.all("/_history?last_history=" + lh);
                    }
                    else {
                        this._clearCache();
                        this._FillItems("/*");
                        return;
                    }
                    rq.storage = this;
                    rq.callback = this._historyReturned;
                    rq.send();
                }
            },

            _historyReturned: function (result) {
                if (result && result.length > 0) {
                    this.storage._processHistory(JSON.parse(result));
                }
                else {
                    this.storage._clearCache();
                    this.storage._FillItems("/*");
                }
            },

            _processHistory: function (items) {
                var storage = this;
                var lh = localStorage[this._baseUrl + "/_history"];
                if (!lh) lh = 0;
                var last_history_counter = parseInt(lh);
                items.each(function (item) {
                    if (item.counter > last_history_counter) {
                        last_history_counter = item.counter;
                    }
                    ;
                    storage.OnServerEvent.fire(item.action, item);
                });
                localStorage[this._baseUrl + "/_history"] = last_history_counter;
            },

            _onAddServerback: function (obj) {
                if (obj.id) {
                    var index = this.cache.getIndex({id: obj.id});
                    if (index == null) {
                        this.get("?id=" + obj.id, function (obj, tunnel) {
                            tunnel.cache.push(tunnel._updateServerItem(obj));
                            tunnel._saveLocalCache();
                            tunnel.OnItemStateUpdatedAsync.fire("ADD", obj);
                        });
                    }
                    else {
                        this.get("?id=" + obj.id, function (obj, tunnel) {
                            tunnel.cache[index] = tunnel._updateServerItem(obj);
                            tunnel._saveLocalCache();
                            tunnel.OnItemStateUpdatedAsync.fire("ADD", obj);
                        });
                    }
                }
            },

            _onDelServerback: function (obj) {
                if (obj.id) {
                    var index = this.cache.getIndex({id: obj.id});
                    if (index != null) {
                        this.cache.splice(index, 1);
                        this._saveLocalCache();
                    }

                }
                this.OnItemStateUpdatedAsync.fire("DEL", obj);
            },

            _onSetServerback: function (obj) {
                if (obj.id) {
                    var index = this.cache.getIndex({id: obj.id});

                    this.get("?id=" + obj.id, function (obj, tunnel) {
                        if (index != null) {
                            tunnel.cache[index] = tunnel._updateServerItem(obj);
                        }
                        else {
                            tunnel.cache.push(tunnel._updateServerItem(obj));
                        }
                        tunnel._saveLocalCache();
                        tunnel.OnItemStateUpdatedAsync.fire("SET", obj);
                    });
                }
            },

            Refresh: function (readyFunc) {
                var ls = localStorage[this._baseUrl];
                if (ls) {
                    this.cache = JSON.parse(ls);
                    if (readyFunc) {
                        readyFunc.call(this, this.cache);
                    }
                }
                else {
                    this._FillItems("/*", readyFunc);
                }
            },


            Sort: function (fieldName) {
                if (!fieldName) return;
                this.cache.sort(function (item1, item2) {
                    if (item1[fieldName] < item2[fieldName]) return -1; // Или любое число, меньшее нуля
                    if (item1[fieldName] > item2[fieldName]) return 1;  // Или любое число, большее нуля
                    return 0;
                });
            },

            get: function (path, callback) {
                var obj = this;
                this._tunnel.get(path, function (result) {
                    if (result && result.length > 0) {
                        result = JSON.parse(result);
                        callback(result, obj);
                        return;
                    }
                    callback(null, obj);
                });
                return this;
            },


            all: function (path) {
                var obj = this;
                if (!path) path = "/*";
                this._tunnel.all(path, function (result) {
                    if (result && result.length > 0) {
                        result = JSON.parse(result);
                        callback(result, obj);
                        return;
                    }
                    callback(null, obj);
                });
                return this;
            },

            add: function (obj) {
                var cache = this.cache;
                var storage = this;
                if (this.cache) {
                    this.cache.push(obj);
                    this._saveLocalCache();
                }
                this.itemsState[obj.id] = "added";
            },

            set: function (obj) {
                var storage = this;
                if (this.cache) {
                    for (var i = 0; i < this.cache.length; i++) {
                        if (this.cache[i].id == obj.id) {
                            this.cache[i] = obj;
                        }
                    }
                    this.itemsState[obj.id] = "modified";
                    localStorage[this._baseUrl] = JSON.stringify(this.cache);
                }
                return this;
            },

            del: function (obj) {
                var storage = this;
                if (this.cache && obj.id) {
                    for (var i = 0; i < this.cache.length; i++) {
                        if (this.cache[i].id == obj.id) {
                            this.cache.splice(i, 1);

                        }
                    }
                    this.itemsState[obj.id] = "deleted";
                    localStorage[this._baseUrl] = JSON.stringify(this.cache);
                }
            },

            each: function (func) {
                for (var i = 0; i < this.cache.length; i++) {
                    func.call(this, this.cache[i]);
                }
            }
        };

        function CachedStorage(url) {
            var storage = this;
            this._tunnel = Net.GetTunnel(url);
        };

        CachedStorage.prototype = {
            Refresh: function (readyFunc, itemready) {
                var storage = this;
                this.all(
                    function () {
                        storage._refreshIndexes();
                        if (readyFunc) readyFunc(storage.items);
                    },
                    function (result) {
                        if (!storage.items) storage.items = [];
                        storage.items.push(result);
                        if (itemready) {
                            window.setTimeout(function () {
                                itemready(result);
                            }, 100);
                        }
                    }
                );
            },

            _refreshIndexes: function () {
                this.indexes = {};
                for (var i = 0; i < this.items.length; i++) {
                    var id = this.items[i].id;
                    this.indexes[id] = i;
                }
            },

            Select: function (start, count) {
                return this.items.slice(start, start + count);
            },

            Sort: function (fieldName) {
                if (!fieldName || !this.items) return;
                this.items.sort(function (item1, item2) {
                    if (item1[fieldName] < item2[fieldName]) return -1; // Или любое число, меньшее нуля
                    if (item1[fieldName] > item2[fieldName]) return 1;  // Или любое число, большее нуля
                    return 0;
                });
            },

            Filter: function (searchexp, callback, limit) {
                var items = 0;
                this.items.each(function (item) {
                    for (var name in item) {
                        if (typeof(item[name]) == 'string' && item[name].contains(searchexp)) {
                            window.setTimeout(function () {
                                callback(item);
                            }, 100);
                            items++;
                            if (limit && items >= limit) {
                                return false;
                            }
                            break;
                        }
                        if (typeof(item[name]) == 'object') {
                            var item2 = item[name];
                            for (var name2 in item2) {
                                if (typeof(item2[name2]) == 'string' && item2[name2].contains(searchexp)) {
                                    window.setTimeout(function () {
                                        callback(item);
                                    }, 100);
                                    items++;
                                    if (limit && items >= limit) {
                                        return false;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    return true;
                });
            },

            get: function (id, callback) {
                if (this.indexes && this.indexes.length > 0) {
                    var ind = this.indexes[id];
                    if (ind != undefined && ind != null) {
                        callback(this.items[ind]);
                        return this;
                    }
                }
                this._tunnel.GET("?action=get&id=" + id, function (result) {
                    callback(JSON.parse(result.replace(/\n/g, " ")));
                });
                return this;
            },

            all: function (callback, onitemcallback) {
                if (this.items) {
                    callback(this.items);
                    return this;
                }
                if (onitemcallback) {
                    var req = this._tunnel.GET("?action=all&chunked=all");
                    req.lastStateChar = 0;
                    req.onreadystatechange = function () {
                        if (this.readyState == 3) {
                            var result = this.responseText;
                            if (result && result.length > 0 && result.length - 1 > this.lastStateChar && this.status == 200) {
                                var end = result.lastIndexOf("\n");
                                result = result.substring(this.lastStateChar, end);
                                this.lastStateChar = end + 1;
                                result = result.split("\n");
                                for (var i = 0; i < result.length; i++) {
                                    var obj = result[i];
                                    if (obj.length > 2) {
                                        try {
                                            obj = JSON.parse(obj);
                                            onitemcallback(obj);
                                        }
                                        catch (err) {
                                            console.log('error parsing object');
                                            console.log(obj);
                                        }
                                    }
                                }
                                /*
                            var endCharIndex = result.indexOf("}", this.lastStateChar);
                            while (endCharIndex > 0) {

                                this.lastStateChar = endCharIndex + 1;
                                endCharIndex = result.indexOf("}", this.lastStateChar)
                            } */
                            }
                        }
                        if (this.readyState == 4) {
                            callback(this.responseText);
                        }
                    };
                    req.send();
                }
                else {
                    var req = this._tunnel.GET("?action=all", function (result) {
                        callback(JSON.parse(result.replace(/\n/g, " ")));
                    });
                }
                return this;
            },

            add: function (obj, callback) {
                if (this.items) {
                    this.items.push(obj);
                }
                this._tunnel.POST("?action=add", JSON.stringify(obj), callback);
                return this;
            },

            set: function (obj, callback) {
                if (obj.id) {
                    if (this.indexes) {
                        var ind = this.indexes[id];
                        if (ind != undefined && ind != null) {
                            this.items[ind] = obj;
                        }
                    }
                    this._tunnel.POST("?action=update&id=" + id, JSON.stringify(obj), callback);
                }
                return this;
            },

            del: function (obj, callback) {
                if (obj.id) {
                    if (this.indexes) {
                        var ind = this.indexes[id];
                        if (ind != undefined && ind != null) {
                            this.items.splice(ind, 1);
                        }
                    }
                    this._tunnel.POST("?action=delete&id=" + obj.id, callback);
                }
                return this;
            },

            each: function (func) {
                if (this.items) {
                    for (var i = 0; i < this.items.length; i++) {
                        func(this.items[i]);
                    }
                }
            }
        };

        WS.DOMload(KLabStorage.Init);
    }

    /*

Storages.Temp - это хранилище информации может существовать, пока страница не будет перезагружена

Storages.Local.Session - существует пока длится сессия, т. е. пока работаем с сайтов
Storages.Local.User - Локальное (на этом компе, для пользователя для конкретного домена)
Storages.Local.Site - Общее для сайта, сохраняется до чистки кеша или переустановки браузера.
Storages.Local(.Persistent, .Shared) - общее хранилище, не привязано к домена

Storages.Server.Session
Storages.Server.User
Storages.Server.Site
Storages.Server(.Persistent)

Storages.Peer.Session
Storages.Peer.User
Storages.Peer.Site
Storages.Peer(.Persistent)

Storages.Global.Session
Storages.Global.User
Storages.Global.Site
Storages.Global(.Persistent)


Storage.Session(.Local, .Server, .Peer, .Global)
Storage.User(.Local, .Server, .Peer, .Global)
Storage.Site(.Local, .Server, .Peer, .Global)
Storage.Persistent(.Local, .Server, .Peer, .Global)

*/

    Storages = {
        Init: function () {

        }
    };


    Storages._storageObject = function () {

    }

    Inherit(Storages._storageObject, EventEmitter, {
        get: function (selector, callback) {
        },
        all: function (selector, callback) {
        },
        set: function (selector, callback) {
        },
        del: function (selector, callback) {
        },
        add: function (selector, callback) {
        }
    });

    Storages._baseStorage = function () {
        Storages._baseStorage.super_.apply(this, arguments);
    };

    Inherit(Storages._baseStorage, Storage, {
        _serializeObject: function (obj) {

        },
        _deSerializeObject: function (obj) {

        }
    });
    /*
Storages.Temp = new Storages._baseStorage();

Storages.Session = {
	Local : new Storages._baseStorage(),
	Server: new Storages._baseStorage(),
	Peer : new Storages._baseStorage(),
	Global : new Storages._baseStorage(),
};

Storages.User = {
	Local : new Storages._baseStorage(),
	Server: new Storages._baseStorage(),
	Peer : new Storages._baseStorage(),
	Global : new Storages._baseStorage(),
};

Storages.Site = {
	Local : new Storages._baseStorage(),
	Server: new Storages._baseStorage(),
	Peer : new Storages._baseStorage(),
	Global : new Storages._baseStorage(),
};

Storages.Persistent = {
	Local : new Storages._baseStorage(),
	Server: new Storages._baseStorage(),
	Peer : new Storages._baseStorage(),
	Global : new Storages._baseStorage(),
};

Storages.Local = Storages.Persistent.Local;
Storages.Local.Session = Storages.Session.Local;
Storages.Local.User = Storages.User.Local;
Storages.Local.Site = Storages.Site.Local;

Storages.Server = Storages.Persistent.Server;
Storages.Server.Session = Storages.Session.Server;
Storages.Server.User = Storages.User.Server;
Storages.Server.Site = Storages.Site.Server;

Storages.Peer = Storages.Persistent.Peer;
Storages.Peer.Session = Storages.Session.Peer;
Storages.Peer.User = Storages.User.Peer;
Storages.Peer.Site = Storages.Site.Peer;

Storages.Global = Storages.Persistent.Global;
Storages.Global.Session = Storages.Session.Global;
Storages.Global.User = Storages.User.Global;
Storages.Global.Site = Storages.Site.Global;*/

    WS.DOMload(function () {
        M.SubscribeTo("http://modules.web-manufacture.net/Storage.js", function () {
            Storages.Temp = Storage;
        });
    });

    Storages.Local = function (storageName) {
        if (!storageName) storageName = "";
        var origin = location.origin;
        if (!this._privacy) origin = "PERSISTENT";
        this.storageKey = "_MAIN_" + storageName + "_ITEM_FOR_" + origin;
        if (this._privacy == "session") {
            this.storage = localStorage.getItem(this.storageKey);
        }
        else {
            this.storage = sessionStorage.getItem(this.storageKey);
        }
        Storages.Local.super_.apply(this, arguments);
        //if (!this.storage){ this.storage = "" };
        //this.storage = DOM.div("", this.storage);
    };

    Inherit(Storages.Local, Storages._baseStorage, {
        on: function () {
            return this.channel.on.apply(this.channel, arguments);
        },

        un: function () {
            return this.channel.un.apply(this.channel, arguments);
        },

        once: function () {
            return this.channel.once.apply(this.channel, arguments);
        },

        _emit: function () {
            return this.channel.emit.apply(this.channel, arguments);
        },


        _save: function () {
            /*if (this._privacy == "session"){
			localStorage.setItem(this.storageKey, this.storage.innerHTML);
		}
		else{
			sessionStorage.setItem(this.storageKey, this.storage.innerHTML);
		}*/
        }
    });


    Storages.Local.Session = Inherit(function () {
        this._privacy = 'session';
        Storages.Local.Session.super_.apply(this, arguments);
    }, Storages.Local);

    Storages.Local.User = Inherit(function () {
        this._privacy = 'user';
        Storages.Local.User.super_.apply(this, arguments);
    }, Storages.Local);

    Storages.Local.Site = Inherit(function () {
        this._privacy = 'site';
        Storages.Local.Site.super_.apply(this, arguments);
    }, Storages.Local);


    Storages.Server = function (url) {
        if (!url) {
            if (window.Config && window.Config.Server) {
                url = Config.Server.ServerStorageUrl;
            }
            if (!url) {
                url = location.origin + "/storage";
            }
        }
        this.url = url;
    };

    Storages.SyncObj = function (storage, dofunc, callback) {
        this.storage = storage;
        this.ready = false;
        this.dofunc = dofunc;
        if (callback) {
            this.on("data", callback);
        }
    }

    Inherit(Storages.SyncObj, Channel, {
        go: function (callback) {
            if (callback) {
                this.on("data", callback);
            }
            this.dofunc();
        }
    });

    Inherit(Storages.Server, Storages._baseStorage, {
        _sendRequest: function (type, selector, data, callback, defer) {
            var storage = this;
            var url = storage.url + "?action=" + type + (selector ? "&selector=" + encodeURIComponent(selector) : "");
            if (window.Auth && (this.sessionKeyRequires || this.loginRequires)) {
                var sobj = {};
                if (this.sessionKeyRequires && window.Auth.Sessionkey) {
                    sobj.SessionKey = Auth.Sessionkey;
                }
                if (this.loginRequires && window.Auth.Login) {
                    sobj.Login = Auth.Login;
                }
                url += "&auth-parameters=" + encodeURIComponent(JSON.stringify(sobj));
            }
            data = data ? JSON.stringify(data) : "";
            var request = Net.POST(url, data);
            request.callback = function (result) {
                var contentType = this.getResponseHeader("Content-Type");
                syncObj.data = result;
                syncObj.ready = true;
                if (callback) {
                    callback.call(this, result, storage);
                }
                syncObj.emit("data", result);
            }
            var syncObj = new Storages.SyncObj(this, function () {
                request.send(data);
            });
            syncObj.request = request;
            if (callback && !defer) syncObj.go();
            return syncObj;
        },

        all: function (selector, callback) {
            if (!callback && typeof(selector) == "function") {
                callback = selector;
                selector = null;
            }
            return this._sendRequest("all", selector, null, callback);
        },

        get: function (selector, callback) {
            if (!callback && typeof(selector) == "function") {
                callback = selector;
                selector = null;
            }
            return this._sendRequest("get", selector, null, callback);
        },

        add: function (selector, data, callback) {
            if (typeof(selector) == "object") {
                data = selector;
                selector = null;
            }
            return this._sendRequest("add", selector, data, callback);
        },


        set: function (selector, data, callback) {
            if (typeof(selector) == "object") {
                data = selector;
                selector = null;
            }
            return this._sendRequest("set", selector, data, callback);
        },

        del: function (selector, callback) {
            return this._sendRequest("del", selector, null, callback);
        }
    });

    Storages.Server.Session = Inherit(function (url) {
        if (!url && window.Config && window.Config.Server) {
            url = Config.Server.SessionStorageUrl;
        }
        this.sessionKeyRequires = true;
        Storages.Server.Session.super_.call(this, url);
    }, Storages.Server, {});

    Storages.Server.User = Inherit(function (url) {
        if (!url) {
            if (window.Config && window.Config.Server) {
                url = Config.Server.UserStorageUrl;
            }
        }
        this.sessionKeyRequires = true;
        this.loginRequires = true;
        Storages.Server.User.super_.call(this, url);
    }, Storages.Server, {});

    Storages.Server.Site = Inherit(function (url) {
        if (!url && window.Config && window.Config.Server) {
            arguments[0] = url = Config.Server.SiteStorageUrl;
        }
        Storages.Server.Site.super_.call(this, url);
    }, Storages.Server);


    Storages.Peer = function () {

    };

    Storages.Peer.Session = Inherit(function () {
    }, Storages.Peer);
    Storages.Peer.User = Inherit(function () {
    }, Storages.Peer);
    Storages.Peer.Site = Inherit(function () {
    }, Storages.Peer);

    Storages.Global = function () {

    };
    Storages.Global.Session = Inherit(function () {
    }, Storages.Global);
    Storages.Global.User = Inherit(function () {
    }, Storages.Global);
    Storages.Global.Site = Inherit(function () {
    }, Storages.Global);

    WS.DOMload(Storages.Init);


    StorageLayer = function (objects) {
        if (!objects) objects = [];
        this.objects = objects;
        this.indexes = {};
        this.internals = {};
        this.types = {};
        this.classes = {};
        if (objects) {
            this._fillIndexes(this.objects);
        }
    }

    StorageLayer.prototype = {
        _fillIndexes: function (data) {
            if (!data) return;
            for (var i = 0; i < data.length; i++) {
                var obj = data[i];
                if (obj.id) {
                    if (this.indexes[obj.id]) {
                        if (!this.indexes[obj.id].length) {
                            this.indexes[obj.id] = [this.indexes[obj.id]]
                        }
                        this.indexes[obj.id].push(obj);
                    }
                    else {
                        this.indexes[obj.id] = obj;
                    }
                }
                if (obj._intID) {
                    this.internals[obj._intID] = obj;
                }
                var type = obj.type;
                if (type) {
                    if (!this.types[type]) this.types[type] = [];
                    this.types[type].push(obj);
                }
                if (data[i].tags) {
                    var classes = data[i].tags.split(' ');
                    for (var cl = 0; cl < classes.length; cl++) {
                        if (classes[cl]) {
                            if (!this.classes[classes[cl]]) {
                                this.classes[classes[cl]] = [];
                            }
                            this.classes[classes[cl]].push(data[i]);
                        }
                    }
                }
            }
        },

        _filterByClasses: function (selector, items) {
            if (!items) return [];
            if (!selector.tags) return [].concat(items);
            var arr = [];
            for (var i = 0; i < items.length; i++) {
                if (selector.is(items[i])) arr.push(items[i]);
            }
            return arr;
        },

        _filterByParameters: function (selector, items) { // Fenrir 21022015 / Фильтр по параметрам
            var arr = [];
            for (var i = 0; i < items.length; i++) {
                if (selector.is(items[i])) arr.push(items[i]);
            }
            return arr;
        }, // Fenrir 21022015 /

        _getByClasses: function (selector, items) {
            if (!items || !selector) return null;
            for (var i = 0; i < items.length; i++) {
                if (selector.is(items[i])) return items[i];
            }
            return null;
        },


        _queryInternal: function (selector, item) {
            if (!selector) return null;
            if (selector.id) {
                var candidate = this.indexes[selector.id];
                if (candidate && candidate.length) {
                    candidate = candidate[0];
                }
                if (!candidate || !selector.is(candidate)) return null;
                return candidate;
            }
            var candidates = this.objects;
            if (selector.type) {
                if (selector.type != "*") {
                    var candidates = this.types[selector.type];
                    if (!candidates) return null;
                }
            }
            return this._getByClasses(selector, candidates);
        },


        _queryAllInternal: function (selector) {
            if (!selector) return;
            if (selector.id) {
                var candidate = this.indexes[selector.id];
                if (candidate && candidate.length) {
                    var newCandidates = [];
                    for (var i = 0; i < candidate.length; i++) {
                        if (selector.is(candidate[i])) {
                            newCandidates.push(candidate[i]);
                        }
                        ;
                    }
                    return newCandidates;
                }
                if (!candidate || !selector.is(candidate)) return [];
                return [candidate];
            }
            if (selector.type && selector.type != "*") {
                var candidates = this.types[selector.type];
            }
            else {
                var candidates = this.objects;
            }
            //return this._filterByClasses(selector, candidates); // Fenrir 21022015
            candidates = this._filterByClasses(selector, candidates);
            candidates = this._filterByParameters(selector, candidates);
            return candidates; // Fenrir 21022015 /
        },

        all: function (selector, callback) {
            if (typeof(selector) == 'string') selector = new Selector(selector);
            return this._queryAllInternal(selector);
        },

        get: function (selector) {
            if (typeof(selector) == 'string') selector = new Selector(selector);
            return this._queryInternal(selector);
        },

        resolveExternalLinks: function (resolver) {
            if (typeof resolver == "function") {
                for (var cl = 0; cl < this.objects.length; cl++) {
                    var obj = this.objects[cl];

                }
            }
        },

        add: function (obj) {
            if (obj) {
                if (obj.id) {
                    if (this.indexes[obj.id]) {
                        if (!this.indexes[obj.id].length) {
                            this.indexes[obj.id] = [this.indexes[obj.id]]
                        }
                        this.indexes[obj.id].push(obj);
                    }
                    else {
                        this.indexes[obj.id] = obj;
                    }
                }
                if (obj.type) {
                    if (!this.types[obj.type]) this.types[obj.type] = [];
                    this.types[obj.type].push(obj);
                }
                if (obj.classes) {
                    for (var cl = 0; cl < obj.classes.length; cl++) {
                        var tag = obj.classes[cl];
                        if (!this.classes[tag]) this.classes[tag] = [];
                        this.classes[tag].push(obj);
                    }
                }
                if (obj._intID) {
                    this.internals[obj._intID] = obj;
                }
                this.objects.push(obj);
                return obj;
            }
            return null;
        },

        del: function (obj) {
            if (obj) {
                var result = false;
                for (var i = 0; i < this.objects.length; i++) {
                    if (this.objects[i] == obj) {
                        this.objects.splice(i, 1);
                        result = true;
                        break;
                    }
                    ;
                }
                if (result) {
                    if (obj.id && this.indexes[obj.id]) {
                        delete this.indexes[obj.id];
                    }
                    if (obj.type && this.types[obj.type]) {
                        var items = this.types[obj.type];
                        for (var i = 0; i < items.length; i++) {
                            if (items[i] == obj) {
                                items.splice(i, 1);
                                break;
                            }
                            ;
                        }
                    }
                    if (obj.classes) {
                        for (var cl = 0; cl < obj.classes.length; cl++) {
                            var tag = obj.classes[cl];
                            var items = this.classes[tag];
                            for (var i = 0; i < items.length; i++) {
                                if (items[i] == obj) {
                                    items.splice(i, 1);
                                    break;
                                }
                                ;
                            }
                        }
                    }
                }
                return result;
            }
            return false;
        }
    };

    Storage = function (data) {
        var stor = this;
        this.Init = function () {
            if (!stor.closed) {
                stor.layers = [];
            }
            stor.prototypes = {};
            stor.defaultType = null;
            stor.defaultProto = null;
        }

        function Watch() {
            if (!stor.watching) {
                //ADD watcher
                /*
			this.watcher = fs.watch(file, {}, function(event, fname){
				console.log("Reloading storage: " + fname + " " + event);
				if (!stor.selfChange && !stor.closed && !stor.reloading){
					stor.Reload();
				}
			});
			stor.watching = true;
			*/
            }
        }

        this.Reload = function (data) {
            if (!stor.closed && !stor.reloading) {
                stor.Init();
                //LOADING FROM EXTERNAL STORAGE
                if (data) {
                    stor.reloading = true;
                    if (typeof data == "string") data = JSON.parse(data);
                    stor._loadStore(data);
                    stor.emit("store-loaded");
                    Watch();
                    stor.reloading = false;
                }
            }
        }
        this.Reload(data);
    }

    Storage.Delete = function (storage) {
        if (!storage.closed) {
            storage._close();
        }
    }

    Inherit(Storage, EventEmitter, {
        _close: function () {
            this.objects = null;
            this.indexes = null;
            this.items = null;
            this.classes = null;
            if (this.watcher) {
                this.watcher.close();
            }
            this.closed = true;
        },

        _loadStore: function (objects) {
            this.layers = [new StorageLayer()];
            if (objects) {
                for (var i = 0; i < objects.length; i++) {
                    this._addToLayer(0, objects[i]);
                }
            }
        },

        LoadData: function (objects) {
            if (Array.isArray(objects)) {
                return this._loadStore;
            }
            return this._loadStore([objects]);
        },

        _save: function () {
            if (this.file && !this.closed) {
                var stor = this;
                if (stor.reloading) {
                    setTimeout(function () {
                        stor._save();
                    }, 200);
                    return;
                }
                this.selfChange = true;
                var objects = [];
                if (this.layers.length > 0) {
                    objects = this.layers[0].objects;
                }
                //STORE TO EXTERNAL STORAAGE
                //fs.writeFileSync(this.file, JSON.stringify(objects));
                this.selfChange = false;
            }
        },

        _initObject: function (obj, selector) {
            if (selector) {
                this._formatObject(selector, obj);
            }
            if (obj.type) {
                var proto = this.prototypes[obj.type];
                if (!proto) proto = this.defaultProto;
                if (proto) obj.prototype = proto;
            }
            else {
                if (this.defaultProto) obj.prototype = this.defaultProto;
            }
        },

        _initObjects: function (objects) {
            if (!util.isArray(objects._childs)) {
                for (var selector in objects._childs) {
                    var obj = objects._childs[selector];
                    this._initObject(obj, selector);
                    if (obj._childs) {
                        this._initObjects(obj._childs);
                    }
                }
            }
            else {
                for (var i = 0; i < objects.length; i++) {
                    this._initObject(objects[i]);
                    if (objects[i]._childs) {
                        this._initObjects(objects[i]._childs);
                    }
                }
            }
        },


        _hasParentInLayer: function (layerNum, obj, parentID) {
            if (!obj) return null;
            if (obj.__layer <= layerNum) {
                return obj._intID == parentID;
            }
            var layer = this.layers[obj.__layer - 1];
            if (!layer) return null;
            var parentObj = layer.internals[obj._parentID];
            return this._hasParentInLayer(layerNum, parentObj, parentID);
        },

        _getFromLayer: function (layerNum, selector, parentID) {
            if (!this.layers[layerNum]) return null;
            if (!selector) return null;
            var items = this.layers[layerNum].all(selector);
            if (!items || !items.length) {
                if (!parentID && !selector.isRoot) {
                    return this._getFromLayer(layerNum + 1, selector);
                }
                else {
                    return null;
                }
            }
            else {
                if (!parentID && !selector.isRoot) {
                    var items2 = this._getFromLayer(layerNum + 1, selector);
                }
            }
            if (parentID) {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item._parentID != parentID) {
                        items.splice(i, 1);
                        i--;
                    }
                }
            }
            if (!items.length) return null;
            if (selector.next) {
                var result = [];
                if (items2 && items2.length) {
                    result = result.concat(items2);
                }
                for (var i = 0; i < items.length; i++) {
                    var fItems = this._getFromLayer(layerNum + 1, selector.next, items[i]._intID);
                    if (fItems) {
                        result = result.concat(fItems);
                    }
                }
                return result;
            }
            if (selector.follow) {
                var result = [];
                if (items2 && items2.length) {
                    result = result.concat(items2);
                }
                for (var i = 0; i < items.length; i++) {
                    var fItems = this._getFromLayer(layerNum + 1, selector.follow);
                    if (fItems) {
                        for (var ff = 0; ff < fItems.length; ff++) {
                            if (!this._hasParentInLayer(layerNum, fItems[ff], items[i]._intID)) {
                                fItems.splice(ff, 1);
                                ff--;
                            }
                            ;
                        }
                        result = result.concat(fItems);
                    }
                }
                return result;
            }
            if (items2 && items2.length) {
                items = items.concat(items2);
            }
            return items
        },


        _getObjects: function (data) {
            if (!data) return null;
            if (!data.length) return [];
            for (var i = 0; i < data.length; i++) {
                data[i] = this._getObject(data[i]);
            }
            return data;
        },

        _getObject: function (data) {
            if (data) {
                if (typeof(data) == 'string')
                    data = new Selector(data);
                else {
                    data.__proto__ = StorageObjectPrototype;
                    if (data.childs) data.childs = this._getObjects(data.childs);
                    if (data.next) data.next = this._getObjects(data.next);
                    if (data.follow) data.follow = this._getObjects(data.follow);
                }
            }
            return data;
        },


        _getId: function () {
            return ("" + Math.random()).replace("0.", "") + ("" + Math.random()).replace("0.", "");
        },

        _addToLayer: function (layerNum, data, parentId) {
            if (!data) return null;
            if (!this.layers[layerNum]) this.layers[layerNum] = new StorageLayer();
            if (!data._intID) data._intID = this._getId();
            if (parentId && !data._parentID) data._parentID = parentId;
            if (!data.__layer) data.__layer = layerNum;
            if (this.layers[layerNum].internals[data._intID]) return null;
            this.layers[layerNum].add(data);
            if (data.childs) {
                for (var i = 0; i < data.childs.length; i++) {
                    this._addToLayer(layerNum + 1, data.childs[i], data._intID);
                }
            }
            if (data.next) {
                this._addToLayer(layerNum + 1, data.next, data._intID);
            }
            if (data.follow) {
                this._addToLayer(layerNum + 1, data.follow, data._intID);
            }
            return data;
        },


        _formatObject: function (selector, data) {
            var internalProps = Selector.InternalProperties;
            if (!selector) {
                return this._getObject(data);
            }
            if (!data) {
                return this._getObject(selector);
            }
            selector = this._getObject(selector);
            data = this._getObject(data)
            if (selector.id && !data.id) {
                data.id = selector.id;
            }
            if (data.classes) {
                for (var i = 0; i < data.classes.length; i++) {
                    if (!data.tags) data.tags = " ";
                    var cls = data.classes[i];
                    if (!data.tags.contains(" " + cls + " ")) {
                        data.tags += cls + " ";
                    }
                }
            }
            if (selector.tags && !selector.classes) {
                selector.classes = selector.tags.trim().split(" ");
            }
            if (selector.classes) {
                for (var i = 0; i < selector.classes.length; i++) {
                    if (!data.tags) data.tags = " ";
                    var cls = selector.classes[i];
                    if (!data.tags.contains(" " + cls + " ")) {
                        data.tags += cls + " ";
                    }
                }
            }
            if (data.tags) {
                data.classes = data.tags.trim().split(" ");
            }
            if (selector.type && !data.type) {
                data.type = selector.type;
            }
            if (selector.childs) {
                if (!data.childs) data.childs = [];
                data.childs = data.childs.concat(this._getObjects(selector.childs));
            }
            if (!data.next) data.next = selector.next;
            if (!data.follow) data.follow = selector.follow;
            for (var item in selector) {
                if (typeof data[item] == "undefined" && !internalProps.contains(item)) {
                    data[item] = selector[item];
                }
            }
            return data;
        },
        getByKey: function (key) {
            for (var i = 0; i < this.layers.length; i++) {
                if (this.layers.internals[key]) {
                    return this.layers.internals[key];
                }
            }
            return null;
        },


        all: function (selector, data) {
            if (this.layers.length == 0) return [];
            var items = null;
            var me = this;
            if (typeof(data) == 'function') {
                var callback = data;
                setImmediate(function () {
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

        get: function (selector, data) {
            var items = null;
            var me = this;
            if (typeof(data) == 'function') {
                var callback = data;
                setImmediate(function () {
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


        set: function (selector, data) {
            if (!data) data = selector;
            data = this._formatObject(selector, data);
            if (data.id) {
                if (this.indexes[data.id]) {
                    var obj = this.indexes[data.id];
                    for (var item in data) {
                        obj[item] = data[item];
                    }
                }
            }
            else {

            }
            this._save();
            return data;
        },

        add: function (selector, data) {
            if (!selector && !data) return;
            if (this.layers.length == 0) this.layers.push(new StorageLayer());
            var items = null;
            var me = this;
            if (typeof(data) == 'function') {
                var callback = data;
                setImmediate(function () {
                    callback.call(me, data);
                });
                data = null;
            }
            data = this._formatObject(selector, data);
            //if (data._intID) data._intID = this._getId();
            this._addToLayer(0, data);
            this._save();
            return data;
        },

        del: function (selector, data) {
            selector = this._formatObject(selector, data);
            if (!selector) return;
            var count = 0;
            var me = this;
            if (typeof(data) == 'function') {
                var callback = data;
                setImmediate(function () {
                    callback.call(me, count);
                });
                data = null;
            }
            for (var i = this.layers.length - 1; i >= 0; i--) {
                var all = this.layers[i].all(selector);
                for (var oi = all.length - 1; oi >= 0; oi--) {
                    if (this.layers[i].del(all[oi])) {
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

    try {
        /*require = function(){
		return {
			EventEmitter : Channel
		}
	}

	module = {
		"export" : null
	}*/
    }
    catch (error) {

    }

    function NodeServer(serverUrl) {
        if (!serverUrl) {
            this.ServerUrl = null; //Url.Resolve(window.location.protocol + "//" + window.location.host);
        }
        else {
            this.ServerUrl = new Url(serverUrl, true);
            this.crossDomain = this.ServerUrl.hostname != window.location.hostname;
        }
        return this;
    }

    NodeServer.prototype = {
        _endRequest: function () {
            if (this.callback) {
                if (typeof(this.callback) == "function") {
                    this.callback(this.responseText, this.status);
                    return;
                }
                if (this.callback.add) {
                    if (DOM) {
                        this.callback.add(DOM.Wrap(this.responseText));
                    }
                    else {
                        this.callback.add(this.responseText);
                    }
                    return;
                }
                delete this.callback;
            }
        },


        _errorRequest: function () {
            if (this.callback) {
                if (typeof(this.callback) == "function") {
                    this.callback(this.responseText, this.status);
                    return;
                }
            }
        },

        _getRequest: function (method, url, callback) {
            var rq = new XMLHttpRequest();
            if (this.ServerUrl) {
                if (typeof url == "string") {
                    url = new Url(url);
                }
                url.rebase(this.ServerUrl);
                url = url.toString();
            }
            rq.open(method, url + "", true);
            rq.callback = callback;
            rq.onload = this._endRequest;
            rq.onerror = this._errorRequest;
            return rq;
        },

        _sendRequest: function (method, url, data, callback) {
            var rq = this._getRequest(method, url, callback);
            rq.send(data);
            return rq;
        },


        get: function (url, callback) {
            return this._sendRequest("GET", url, null, callback);
        },

        browse: function (url, callback) {
            var rq = this._getRequest("SEARCH", url, callback);
            //rq.setRequestHeader("content-type", "application/json");
            //rq.setRequestHeader("content-type", "text/plain");
            rq.send();
            return rq;
        },

        save: function (url, text, contentType, callback) {
            var rq = this._getRequest("POST", url, callback);
            if (!contentType) {
                contentType = "text/plain";
            }
            rq.setRequestHeader("content-type", contentType);
            rq.send(text);
            return rq;
        },

        del: function (url, callback) {
            return this._sendRequest("DELETE", url, null, callback);
        },

        run: function (url, callback) {
            url = Url.Resolve(url, {action: "start"});
            return this._sendRequest("MKACTIVITY", url, null, callback);
        },

        reset: function (url, callback) {
            url = Url.Resolve(url, {action: "reset"});
            return this._sendRequest("MKACTIVITY", url, null, callback);
        },

        stop: function (url, callback) {
            url = Url.Resolve(url, {action: "stop"});
            return this._sendRequest("MKACTIVITY", url, null, callback);
        },


        status: function (url, callback) {
            url = Url.Resolve(url, {action: "status"});
            return this._sendRequest("MKACTIVITY", url, null, callback);
        },
    };
    if (!UsingDOM("Ui")) {

        ui.id = "UI";
        ui.url = "ui.js";

        ui.info = L.Info;
        ui.error = L.Error;

        ui.Init = function () {
            Ev.CreateEvent("OnActionEvent", ui);
            ui.info("UI Initializing");
            ui.onload(function() {
                C.Process(WS.Body, "ui-processing");
            });
            ui.namespace = M.Namespaces.ui;
            ui.componentStorage = new Storage();
        };

        ui.ModuleInitialized = function (url, module) {
            //M.OnModuleRegistered.unsubscribe(ui.ModuleInitialized, url);
            J.info("jasp-init", url);
            WS.Body.all(".component[component-url='" + url + "'].jasp-processing-uicomponents").del(".jasp-processing-uicomponents");
            if (module.initComponent) {
                var context = {Condition: "ui-processing"};
                context.Selector = "";
                context.Process = function (element, context, param) {
                    module.initComponent.apply(this, arguments);
                    element.OnComponentInitialized.fire();
                }
                context = C.Add(context);
                context.Selector = ".component[component-url='" + url + "']:not(.jasp-processed-" + context.id + ")";
                C.ProcessContext(WS.Body, context);
            }
            return "del";
        };

        ui.ComponentContext = {
            Condition: "ui-processing",
            id: "uicomponents",
            Selector: ".component[component-url]:not(.jasp-processed-uicomponents)",
            Process: function (element) {
                var url = element.componentUrl = element.attr("component-url");
                var wait = element.wait = element.attr("wait");
                url = url.toLowerCase();
                element.set("@component-url", url);
                Ev.CreateEvent("OnComponentInitialized", element);
                var module = M.GetModuleByUrl(url);
                if (module) {
                    if (module.initComponent) {
                        module.initComponent.apply(this, arguments);
                        element.OnComponentInitialized.fire();
                    }
                }
                else {
                    M.OnModuleRegistered.subscribe(ui.ModuleInitialized, url);
                    element.module = M.Load(url, "component " + element.ToString());
                    return false;
                }
                return true;
            }
        };


        C.Add(ui.ComponentContext);


        //<div class='action' on=":click" atype="class-toggle" for="#Item22" set=".invisible.showed">

        ui.UIActionContext = {
            Condition: "ui-processing",
            id: "uiaction",
            Selector: ".ui-action:not(.jasp-processed-uiaction)",
            Process: function (element) {
                var asel = element.uiActionSelector = element.attr("for");
                var atype = element.uiActionType = element.attr("atype");
                if (!atype) {
                    atype = element.uiActionType = element.attr("action-type");
                }
                if (!atype) {
                    ui.Error("Element " + element.ToString() + " has no action-type or atype attribute!");
                    return true;
                }
                var aevent = element.uiActionEvent = element.attr("on");
                if (!aevent) {
                    aevent = element.uiActionEvent = ":click";
                }

                var handler = ui.UIActionHandlers[atype];
                if (handler) {
                    element.uiActionHandler = function () {
                        ui.info("UI Action: " + element.uiActionType + ":" + element.uiActionEvent + " -> " + element.uiActionSelector);
                        window.setTimeout(function () {
                            try {
                                handler(element, element.uiActionType, element.uiActionSelector, element.uiActionEvent)
                            }
                            catch (err) {
                                console.log(err);
                            }
                        }, 100);
                    };
                }
                else {
                    ui.Error("Element " + element.ToString() + " has unknown event type: " + atype);
                    return true;
                }

                if (aevent.start(":")) {
                    aevent = ui.ElementEvents[aevent];
                    if (aevent) {
                        element[aevent] = element.uiActionHandler;
                    }
                    else {
                        ui.Error("Element " + element.ToString() + " has unknown event emitter: " + aevent);
                    }
                }
                else {
                    ui.OnActionEvent.subscribe(ui.UIActionRecurseHandler, aevent);
                    ui.info("Subscribe on " + aevent + " action " + aname + ":" + atype + " for " + asel);
                }
                return true;
            }
        };

        C.Add(ui.UIActionContext);

        ui.UIActionRecurseHandler = function (ename, elem) {
            ui.info("Recurse event emitted: " + ename);
            if (elem) {
                elem.uiActionHandler();
            }
        };

        ui.UIActionHandlers = {
            "event": function (elem, atype, asel, aevent) {
                ui.OnActionEvent.fire(asel, elem)
            },

            "class-toggle": function (elem, atype, asel, aevent) {
                var aname = elem.attr("set");
                if (aname) {
                    var target = DOM._all(asel);
                    target.each(function (elem) {
                        if (this._is(aname)) {
                            this._del(aname);
                        }
                        else {
                            this._add(aname)
                        }
                    });
                }
            },

            "show": function (elem, atype, asel, aevent) {
                var target = DOM._all(asel);
                target.each(function (elem) {
                    this.show();
                });
            },

            "hide": function (elem, atype, asel, aevent) {
                var target = DOM._all(asel);
                target.each(function (elem) {
                    this.hide();
                });
            },


            "visibility-toggle": function (elem, atype, asel, aevent) {
                var target = DOM._all(asel);
                target.each(function (elem) {
                    if (this._is(".invisible")) {
                        this.show();
                    }
                    else {
                        this.hide()
                    }
                });
            },

            "ins": function (elem, atype, asel, aevent) {
                var aname = elem.attr("set");
                if (aname) {
                    var target = DOM._all(asel);
                    target._ins(aname);
                }
            },

            "set": function (elem, atype, asel, aevent) {
                var aname = elem.attr("set");
                if (aname) {
                    var value = null;
                    var target = DOM._all(asel);
                    if (aname.contains("=")) {
                        var parts = aname.split("=");
                        aname = parts[0];
                        value = parts[1];
                    }
                    target._set(aname, value);
                }
            },
        };

        ui.UIActionHandlers["class-on"] =
            ui.UIActionHandlers["add"] =
                function (elem, atype, asel, aevent) {
                    var aname = elem.attr("set");
                    if (aname) {
                        var target = DOM._all(asel);
                        target._add(aname);
                    }
                };

        ui.UIActionHandlers["class-off"] =
            ui.UIActionHandlers["del"] =
                function (elem, atype, asel, aevent) {
                    var aname = elem.attr("set");
                    if (aname) {
                        var target = DOM._all(asel);
                        target._del(aname);
                    }
                };

        ui.ElementEvents = {
            ":click": "onclick",
            ":hover": "onmouseover",
            ":d-click": "ondblclick",
            ":receive": "ondropreceive",
            ":drop": "OnDrop"
        };

        ui.getNamespace = function (namespace) {
            var parts = namespace.split('.');
            if (parts[0].toLowerCase() == "ui") {
                parts.shift();
            }
            var ns = ui.namespace;
            for (var i = 0; i < parts.length; i++) {
                if (ns[parts[i]]) {
                    ns = ns[parts[i]];
                }
                else {
                    ns = null;
                    ui.error("UI namespace " + namespace + " not found!");
                    return null;
                }
            }
            return ns;
        }


        ui.createNamespace = function (namespace) {
            var parts = namespace.split('.');
            if (parts[0].toLowerCase() == "ui") {
                parts.shift();
            }
            var ns = ui.namespace;
            for (var i = 0; i < parts.length; i++) {
                if (!ns[parts[i]]) {
                    ns[parts[i]] = {};
                }
                ns = ns[parts[i]];
            }
            return ns;
        }

        ui.baseComponent = function (options) {
            if (!options) options = {};
            if (typeof(options) == "object") {
                this.classes = options.classes;
                this.tags = options.tags;
                this.id = options.id;
                if (options.childs) {
                    this.childs = [];
                    for (var i = 0; i < options.childs.length; i++) {
                        var child = ui.create(childs[i]);
                        child.parent = this;
                        this.childs.push(child);
                    }
                }
            }
            if (!this.id) this.id = this.type + Math.random().toString().replace("0.", "");
            if (typeof options.dom == "object" && options.dom.nodeType == 1) {
                this.render(options.dom);
            }
        }

        Inherit(ui.baseComponent, EventEmitter, {
            type: "BaseComponent",

            render: function (dom) {
                if (this.childs) {
                    for (var i = 0; i < this.childs.length; i++) {
                        this.childs[i].render(dom);
                    }
                }
            },

            show: function (timeout) {
                var me = this;
                if (typeof timeout == 'number') {
                    setTimeout(function () {
                        this.hide();
                    }, timeout);
                }
                this.dom.show();
            },

            hide: function () {
                this.dom.hide();
            },

            remove: function () {
                this.dom.map = null;
                this.dom.del();
            },

            map: function (obj) {

            }
        })

        ui.register = function (namespace, inherit, creator, mixin) {
            if (creator) {
                if (typeof(inherit) == "function" && typeof(creator) == "object") {
                    mixin = creator;
                    creator = inherit;
                    inherit = ui.baseComponent;
                }
            }
            else {
                if (typeof(inherit) == "function") {
                    creator = inherit;
                    inherit = ui.baseComponent;
                }
                if (typeof(inherit) == "string") {
                    creator = new Function();
                }
            }
            if (typeof(inherit) == "string") {
                var i_ns = ui.getNamespace(namespace);
                if (!i_ns) return null;
                inherit = i_ns.create;
            }
            var ns = ui.createNamespace(namespace)
            ns.create = creator;
            if (typeof inherit == "function") {
                Inherit(creator, inherit, mixin);
            }
            ns.base = inherit.prototype;
            creator.prototype.type = ns.type;
            creator.prototype.namespace = ns;
            ui.info("registered", "namespace " + namespace);
            return ns;
        }

        ui.create = function (namespace, options) {
            if (typeof namespace == "object") {
                options = arguments[1] = namespace;
                namespace = namespace.type;
            }
            var ns = ui.getNamespace(namespace);
            if (ns && typeof(ns.create) == "function") {
                return new ns.create(arguments[1], arguments[2], arguments[3], arguments[4],
                    arguments[5], arguments[6], arguments[7], arguments[8]);
            }
            return null;
        }

        ui.onload = function (callback) {
            if (M && M.OnModulesLoaded) {
                if (M.modulesLoaded) {
                    callback();
                }
                else {
                    M.OnModulesLoaded.subscribe(callback);
                }
            }
            else {
                WS.DOMload(function () {
                    if (M.modulesLoaded) {
                        callback();
                    }
                    else {
                        M.OnModulesLoaded.subscribe(callback);
                    }
                });
            }
        }

        ui.ShadowEventEmitter = function (element) {
            var self = this;
            var baseOn = this.on;
            this.on = this.subscribe = function (name, handler) {
                element.addEventListener(name, function () {
                    return handler.apply(self, arguments);
                });
                return baseOn.apply(self, arguments);
            }
            element.on = function (name, handler) {
                return self.on.apply(self, arguments);
            }
            element.emit = element.do = element.fire = function () {
                return self.emit.apply(self, arguments);
            }
        }

        Inherit(ui.ShadowEventEmitter, EventEmitter);

        ui.inherit = function (namespace, creator, mixin) {
            creator.namespace = namespace;
            var context = {
                Condition: "ui-processing",
                id: "uicomponentInitializer" + namespace,
                Selector: namespace + ".component:not(.initialized)",
                Process: function (element) {
                    element.add(".initialized");
                    element.shadow = new creator(element);
                    return true;
                }
            };
            C.Add(context);
            return Inherit(creator, ui.ShadowEventEmitter, mixin);
        }


        WS.DOMload(ui.Init);
    }
}