function Logger(ChannelPrefix, useConsole, level){
	this.channelPrefix = ChannelPrefix;
	this.useConsole = useConsole;
	if (level){
		this.level = level;
	}
	else{
		if ((typeof(Frame) !== "undefined") && Frame && Frame.LogLevel){
			this.level = Frame.LogLevel;
		}
		else{
			this.level = Logger.Levels.all;
		}
	}
}

Logger.setLogLevel = function(ll){
    Logger.level  = ll;
}

Logger.Levels = {
	fatal : 1,
	error : 2,
	warn : 3,
	info : 4,
	log : 5,
	debug : 6,
	trace : 7,
	all : 100,
	"?" : 0
}

Logger.create = function(cp){
	return new Logger(cp);	
};

Logger._parseArguments = function(args){
	var text = args[0];
	if (text && args.length > 1){
		for (var i = 1; i < args.length; i++){
			var re = new RegExp("[{]" + (i-1) + "[}]", 'g');
			text = text.replace(re, args[i]);
		}
	}
	return text;
}


global.info = Logger.info = function(text) {
    return global.log(Logger._parseArguments(arguments), "info");
}

global.error = Logger.error = function(error) {
	if (typeof error == "string") {
		global.log(Logger._parseArguments(arguments), "error");
		return;
	}
	arguments[0] = { message: error.message, stack: error.stack };
	return global.log(Logger._parseArguments(arguments), "error");
}

global.debug = Logger.debug = function(text) {
    return global.log(Logger._parseArguments(arguments), "debug");
}

global.warn = Logger.warn = function(text) {
    return global.log(Logger._parseArguments(arguments), "warn");
}

global.log = Logger.log = function(value, type) {
	return Logger.prototype._localLog.call(this, value, type);
}

global.useConsole = true;

consoleColors = {
	normal : "\u001b[40m\u001b[37m\u001b[0m",
	warn : "\u001b[33m",
	debug : "\u001b[1m\u001b[30m",	
	error : "\u001b[1m\u001b[31m", //Red
	info : "\u001b[37m", //Gray
	success: "",
	grey	:	 "\u001b[1m\u001b[30m",
	black	:	 "\u001b[30m",
	red		:    "\u001b[31m",
	green	:	 "\u001b[0m\u001b[32m",
	bright	:	 "\u001b[1m",
	yellow	:    "\u001b[0m\u001b[33m",
	blue	:	 "\u001b[34m",
	violet	:	 "\u001b[35m",
	marine	:	 "\u001b[36m", 
	white	:	 "\u001b[37m",
}

/*
 " \u001b[30m" - black
 " \u001b[31" -  red
 " \u001b[32" -  green
 " \u001b[33m" - yellow
 " \u001b[34m" - blue
 " \u001b[35m" - violet
 " \u001b[36m" - marine
 " \u001b[37m" - white
 
  "\u001b[1m" - add Bright
  
  Background - 
  
 " \u001b[40m" - black
 " \u001b[41" -  red
 " \u001b[42" -  green
 " \u001b[43m" - yellow
 " \u001b[44m" - blue
 " \u001b[45m" - violet
 " \u001b[46m" - marine
 " \u001b[47m" - white 
 */
 
Logger.parseFormatedString = function(text){
	return text.replace(/%(\w+);/ig, function(value, g1){
		return consoleColors[g1] !== undefined ? consoleColors[g1] : value;
	});
}

Logger.prototype = {
	info: function(text) {
		return this._localLog(Logger._parseArguments(arguments), "info");
	},

	error: function(error) {
		if (typeof error == "string") {
			this._localLog(Logger._parseArguments(arguments), "error");
			return;
		}
		arguments[0] = { message: error.message, stack: error.stack };
		return this._localLog(Logger._parseArguments(arguments), "error");
	},

	warn: function(text) {
		return this._localLog(Logger._parseArguments(arguments), "warn");
	},

	debug: function(text) {
		return this._localLog(Logger._parseArguments(arguments), "debug");
	},
	
	trace: function(text) {
		return this._localLog(Logger._parseArguments(arguments), "trace");
	},
	
	log: function(value, type) {
		return this._localLog(Logger._parseArguments(arguments), type);
	},

	_localLog: function(value, type) {
		if (!type) {
			type = "?";
		}
		var llevel = Logger.Levels[type];
		if (llevel && llevel > this.level){
			return false;
		}		
		if (global.Channels) {
			message = { content: value, datetime: new Date(), type: type };
			var cpostfix = "";
			if (this.channelPrefix){
				cpostfix = ("/" + this.channelPrefix);
			}
			Channels.emit("/log." + type + cpostfix, message)
		}
		if (this.useConsole || !global.Channels){
			var c = consoleColors[type];
			if (typeof value == 'string'){
				value = Logger.parseFormatedString(value);
				if (c) value = c + value; 
				else value = consoleColors.normal + value; 
				if (this.channelPrefix) value = consoleColors.bright + consoleColors.white + this.channelPrefix + "> " + consoleColors.normal + value ;
				value += consoleColors.normal;
			}
			console.log(value);
		}
		return true;
    },

    setLogLevel : function(lev){
        this.level = lev;
    }
}


module.exports = Logger;