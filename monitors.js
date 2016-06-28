var Path = require('path');
var fs = require('fs');
var EventEmitter = require('events');
var util = require('util');
var os = require("os");

MonitorBase = function(options){
    for (var item in options){
        if (this[item] == undefined){
            this[item] = options[item];
        }
    }
	var self = this;
	this.history = [];
	this.error = this.emit.bind(this, "error");
	process.stdin.setEncoding("utf8");
    process.stdout.setEncoding("utf8");
	if (!this.isHidden){
    	this.on("start", function(port){
    	    console.warn("\n>>> Supervisor socket created on " + port);
    	});
    	this.on("stop", function(){
    	    console.warn("\n>>> Supervisor socket stopped");
    	});
    	this.on("error", function(err){
    	    console.error("\n>>> Supervisor socket error: ");
			console.error(err);
    	});
    	this.on("connect", function(path){
    	    console.warn("\n>>> Supervisor socket connection: " + path);
    	});
    	this.on("disconnect", function(path){
    	    console.warn("\n>>> Supervisor socket disconnect");
    	});
    	this.on("virtual-start", function(options){
    	    console.warn("\n>>> Supervisor Virtual starting");
    	    console.log(options)
    	});
    	this.on("virtual-stop", function(){
    	    console.warn("\n>>> Supervisor Virtual stopping");
    	});
    	this.on("virtual-output", function(data){
    	    if (self.saveHistory){
    	        self.history.push(data);
    	    }
    	    console.log(data.toString());
    	});
	};
	
}

util.inherits(MonitorBase, EventEmitter);



MonitorBase.prototype.startVirtual = function(options){
    this.emit("virtual-start", options);
}

MonitorBase.prototype.stopVirtual = function(options){
    this.emit("virtual-stop", options);
}

MonitorBase.prototype._onSocketConnected = function(socket){
    var self = this;
	var path = '/';
	if (socket.namespace){
		path += socket.namespace.name;
	}
	this.emit("connect", path, socket);
	socket.on('error', this.emit.bind(this, "error"));

	var handler = function(data){
		socket.emit("shell-output", {text : data});
	}
	
	self.on("virtual-output", handler);	

	var exitHandler = function(){
	    socket.emit("shell-exited");
	}
	
	var startHandler = function(data){
		socket.emit("shell-started", data);
	}

	self.on("virtual-exited", exitHandler);
	self.on("virtual-start", startHandler);	
	
	socket.on('disconnect', function (socket) {
	    self.emit("disconnect", socket);
	    self.removeListener("virtual-exited", exitHandler);	
	    self.removeListener("virtual-start", startHandler);	
		self.removeListener("virtual-output", handler);
	});
	
	socket.on("cmd-message", function(message){
	    if (self.cmdState){
		    self.emit("virtual-cmd", message.text);
	    }
	});
	
	socket.on("cmd-stop", function(message){
	    self.stopVirtual(message);
	});
	
	socket.on("cmd-start", function(message){
	    self.startVirtual(message);
	});
	
	if (self.saveHistory){
	    socket.send(self.history, self.cmdState);  
	};
}

MonitorBase.prototype.start = function(){
	var self = this;
	
	this.SockServer = require('socket.io').listen(this.port, { log: false});
	
	this.emit("start", this.port);
	
	this.SockServer.on('error', function(err){
		self.error(err);
	});
	
	this.SockServer.on('connection', this._onSocketConnected.bind(this));	
	
	if (!this.cmdState){
	    this.startVirtual();
	}
};


MonitorBase.prototype.stop = function(){
    if (this.cmdState){
        this.stopVirtual();
    }
    if (this.SockServer){
	    this.SockServer.close();
	    this.SockServer = null;
	}
};

function SpawnMon(){
	var self = this;
	SpawnMon.super_.apply(this, arguments);
}

util.inherits(SpawnMon, MonitorBase);
				
SpawnMon.prototype.startVirtual = function(options){
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
    var cp =  require('child_process').spawn(options.command, options.args, cpOpts);
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

module.exports = {
    SpawnMonitor : SpawnMon
};
