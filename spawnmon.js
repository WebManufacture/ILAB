
SpawnMon = function(socketPort){
	var self = this;
	this.port = socketPort;
	
	process.stdout.setEncoding("utf8");
	process.stdin.setEncoding("utf8");
				
	this.cmd = function(){
	    if (os.platform() == "linux"){
	        var cp =  require('child_process').spawn('sh', [], {shell: true, stdio: ['pipe', 'pipe', 'inherit']});
	        var onCmd =  function(cmd){
        	    data = new Buffer(cmd + "\n", 'utf8');
        	    cp.stdin.write(data); 
            }
        	
        	var onStdOut = function(data){
        	    //data = new Buffer(data, 'UCS-2');
        	    //data = data.toString("utf8");
        		self.emit("output", data.toString());
        		console.log(data.toString());
        	}
	    }
	    if (os.platform() == "windows"){
	        var cp =  require('child_process').spawn('cmd', ["/U"], {shell: true, stdio: ['pipe', 'pipe', 'inherit']});
	        if (cp.stdin){
        		cp.stdin.setEncoding("UCS-2");
        	}
        	if (cp.stdout){
        		cp.stdout.setEncoding("UCS-2");
        	}
    
        	var onCmd =  function(cmd){
        	    data = new Buffer(cmd + "\n", 'utf8');
        	    cp.stdin.write(data); 
            }
        	
        	var onStdOut = function(data){
        	    //data = new Buffer(data, 'UCS-2');
        	    //data = data.toString("utf8");
        		self.emit("output", data);
        		console.log(data);
        	}
	    }
		
		self.cmdState = true;
			self.on("cmd", onCmd);
        
        self.once("stop", function(){
           cp.kill(); 
        });
		
		
		cp.stdout.on("data", onStdOut);
	
        cp.once("exit", function(){
           self.removeListener("cmd", onCmd);
           self.emit("exited")
           console.log("Child process exited"); 
           self.cmdState = false;
        });
				
    }
    
	this.start = function(){
		this.SockServer = require('socket.io').listen(this.port, { log: false});
		
		console.warn("\n>>> Supervisor socket created on " + this.port);
		
		this.SockServer.on('error', function(err){
			console.error("\n>>> Supervisor socket error: ");
			console.error(err);
		});
			
		
		this.SockServer.on('connection', function (socket) {
			var path = '/';
			if (socket.namespace){
				path += socket.namespace.name;
			}
			console.warn("\n>>> Supervisor socket connection: " + path);
			socket.on('error', function (err) {
				console.error("\n>>> Supervisor socket server error: " + path);
				console.error(err);
			});
			var handler = function(data){
				socket.emit("shell-output", {text : data});
			}
			self.on("output", handler);	
			var exitHandler = function(){
			    socket.emit("shell-exited");
			}
			self.on("exited", exitHandler);	
			socket.on('disconnect', function (socket) {
			    console.warn("\n>>> Supervisor socket disconnect");
			    self.removeListener("exited", exitHandler);	
				self.removeListener("output", handler);
			});
			socket.on("cmd-message", function(message){
			    if (self.cmdState){
				    self.emit("cmd", message.text);
			    }
			});
			socket.on("cmd-stop", function(message){
				self.emit("stop", message);
			});
			socket.on("cmd-start", function(message){
				if (!self.cmdState){
        		    self.cmd();
        		}
			});
		});	
		if (!self.cmdState){
		    self.cmd();
		}
	}
	
	this.stop = function(){
		if (this.SockServer){
			this.SockServer.close();
			this.SockServer = null;
		}		
	}
};

util.inherits(SpawnMon, EventEmitter);

module.exports = SpawnMon;
