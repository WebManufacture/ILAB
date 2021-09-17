var util = require("util");
var Path = require("path");

if (!global.Inherit) {
	global.Inherit = function (Child, Parent, mixin) {
		if (typeof(Child) == "string") {
			Child = window[Child] = function () {
			};
		}
        if (typeof Parent == 'function') {
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
            Child.base = Parent.prototype;
            childProto._base = Parent.prototype;
            childProto._super = Child._super = Child.super_ = function (args) {
                Child.base.constructor.apply(this, arguments);
            }
            return Child;
        }
		if (typeof Parent == 'object'){
			var F = function () {};
			F.prototype = Parent;
			var childProto = Child.prototype = new F();
			childProto.constructor = Child;
			childProto.className = Child.name;
			if (mixin) {
				for (var item in mixin) {
					childProto[item] = mixin[item];
				}
			}
			var parentProto = Child.base = F;
			childProto._base = F;
			childProto._super = childProto.super = Child.super = Child.super_ = function (args) {};
			return Child;
		}
		console.error("UTILS: Inheriting from unknown!")
	};

	Object.defineProperty(Object.prototype, "classType", {
		enumerable: false,
		get: function () {
			var str = {}.toString.call(this);
			str = str.substr(1, str.length - 2);
			return str.replace("object ", "");
		}
	});

    Function.prototype.hasPrototype = function(protoName){
        if (this.name == protoName) return true;
        if (this.name == "Function") return false;
        if (this.base && this.base.constructor && typeof this.base.constructor == "function") return this.base.constructor.hasPrototype(protoName);
        return false;
    };
}

global.createUUID = function(){
    var source = '';
    for (var i = 0; i < 3; i++){
        source += parseInt((Math.random() + "").replace("0.", "")).toString(16);
    }
    return source.slice(0,8) + "-" + source.slice(8,12) + "-" + source.slice(12,16)  + "-" + source.slice(16,20) + "-" + source.slice(20,32);
}

global.extend = function (Child, Parent) {
    var F = function() { }
    F.prototype = Parent.prototype
    Child.prototype = new F()
    Child.prototype.constructor = Child
    Child.superclass = Parent.prototype
}

global.mixin = function (Parent, Child) {
    for (var item in Child){
		if (typeof Child[item] == "function" && Parent[item] == undefined){
			Parent[item] = Child[item];
		}
	}
}

global.EvalInContext = function(code, context, param){
	var func = function(){
		return eval(code);
	}
	return func.call(context, param);
}

global.CreateClosure = function(func, thisParam, param1, param2, param3){
	if (!func) return;
	if (param1){
		if (param2){
			if (param3){
				return function(){
					func.call(thisParam, param1, param2, param3);
				}
			}
			return function(){
				func.apply(thisParam, param1, param2);
			}
		}
		return function(){
			func.apply(thisParam, param1);
		}
	}
	return function(){
		return func.apply(thisParam, arguments);
	}
}

global.CreateClosureMap = function(func, thisParam, paramNums){
	if (!func) return;
	if (paramNums){
		if (typeof (paramNums) == 'number'){
			return function(){
				func.call(thisParam, arguments[paramNums - 1]);
			}	
		}
		if (typeof (paramNums) == 'object' && paramNums.length){
			return function(){
				var params = [];
				for (var i = 0; i < paramNums.length; i++){
					params.push(arguments[paramNums[i]]);
				}
				func.apply(thisParam, params);
			}
		}
	}
	return function(){
		func.apply(thisParam, arguments);
	}
}

Date.prototype.formatTime = function(withMilliseconds){
	if (withMilliseconds){
		return this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds() + "." + this.getMilliseconds();	
	}
	else{
		return this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds();
	}
};

Date.prototype.formatDate = function(separator, reverse){
	var date = this.getDate();
	if (date < 10){
		date = "0" + date;
	}
	var month = this.getMonth() + 1;
	if (month < 10){
		month = "0" + month;
	}
	if (!separator){ separator = "-" }
	if (reverse){
		return date + separator + month + separator + this.getFullYear();	
	}
	else
	{
		return this.getFullYear() + separator + month + separator + date;	
	}
};

Date.prototype.formatDateRus = function(){
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
	"август",
	"сентябрь",
	"октябрь",
	"ноябрь",
	"декабрь"
];

Date.prototype.formatRus = function(){
	var date = this.getDate();
	var month = Date.MonthRusNames[this.getMonth()];
	return date + " " + month + " " + this.getFullYear();	
};

Date.ParseRus = function(value){
	var dt = value.split(" ");
	var time = null;
	if (dt.length > 1){
		var time = dt[1].split(":");
	}
	var date = dt[0].split(".");
	if (time){
		return new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]), parseInt(time[0]), parseInt(time[1]));	
	}
	else{
		return new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]));
	}
};

Array.prototype.Contains = Array.prototype.contains = Array.prototype.has = function(value){
	return this.indexOf(value) >= 0;
};

String.prototype.Contains = function(str) {
	var type = typeof(str);
	if (type == "string"){
		return this.indexOf(str) >= 0;
	}
	if (str.length != undefined){
		for (var i = 0; i < str.length; i++) {
			if (this.indexOf(str[i]) >= 0) return true;
		}
	}    
	return false;
};


String.prototype.endsWith = String.prototype.end = String.prototype.ends = function(str) 
	{
		return this.lastIndexOf(str) == this.length - str.length;
	};

function StringSelector(){
	return DOM(this);
};

//String.prototype.__defineGetter__("sel", StringSelector);

String.prototype.contains = String.prototype.has = function(substr){
	return this.indexOf(substr) > -1;
};  

String.prototype.start = function(str){
	return this.indexOf(str) == 0;
};

String.prototype.get = function(regex){
	if (regex instanceof RegExp){
		var match = regex.exec(this);
		if (match.length > 0) return match[match.length - 1];
		return null;
	}
	return null;	
};