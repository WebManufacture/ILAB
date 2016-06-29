var EventEmitter = require('events');
var util = require('util');
var os = require("os");

function SpawnMon(){
    return EventEmitter.call(this);
}

util.inherits(SpawnMon, EventEmitter);

SpawnMon.prototype.start = function(options){
	var onCmd, onStdOut;
	var self = this;
	if (self.cmdState){
		self.error("trying to start live VM");
		return;
	}
	if (!options) options = {};
	var platform = os.platform();
	if (!options.command){
		switch (platform) {
			case 'linux':
				options.command = 'sh';
				break;
			case 'win32':
			case 'win64':
				options.command = 'cmd';
				options.args = ["/U"];
				break;
			default :
				self.error("No platform detected for " + platform);
				options.command = 'sh';
		}
	}
	if (!options.args) {
		options.args = [];
	}
	var cpOpts = {shell: true, stdio: ['pipe', 'pipe', 'inherit']};
	if (self.workPath && !options.workPath){
		options.workPath = self.workPath;
	}
	if (options.workPath){
		cpOpts.cwd = Path.resolve(options.workPath);
	}
	self.history = [];
	var cp = self.cp = require('child_process').spawn(options.command, options.args, cpOpts);
	if (options.command == "cmd"){
		if (cp.stdin){
			cp.stdin.setEncoding("UCS-2");
		}
		if (cp.stdout){
			cp.stdout.setEncoding("UCS-2");
		}
	}
	self.emit("virtual-start", options);
	var onCmd =  function(cmd){
		data = new Buffer(cmd + "\n", 'utf8');
		cp.stdin.write(data);
	}

	var onStdOut = function(data){
		//data = new Buffer(data, 'UCS-2');
		//data = data.toString("utf8");
		self.emit("virtual-output", data.toString());
	}

	self.cmdState = true;

	self.on("virtual-cmd", onCmd);
	self.once("virtual-stop", function(){
		cp.kill();
	});

	cp.stdout.on("data", onStdOut);

	cp.once("exit", function(){
		self.removeListener("virtual-cmd", onCmd);
		self.emit("virtual-exited")
		self.cmdState = false;
	});
};

SpawnMon.prototype.cmd = function(cmd) {
	self.emit("virtual-cmd", cmd);
}

SpawnMon.prototype.stop = function(callback){
	var self = this;
	if (!self.cmdState){
		self.error("trying to stop died VM");
		return;
	}
	if (typeof callback == "function")
		self.once("virtual-exited", callback);
	self.emit("virtual-stop");
};

module.exports = SpawnMon;