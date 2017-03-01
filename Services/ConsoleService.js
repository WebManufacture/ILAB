var Path = require('path');
var fs = require('fs');
var os = require("os");
useModule("utils.js");
var Service = useRoot("/System/Service.js");

/*Events
 virtual-start
 virtual-stop
 virtual-exited
 virtual-cmd
 virtual-error
 virtual-output
 */
function ConsoleService(params){
    var self = this;
    this.Command = function (text) {
        return self.cmd(text);
    };
    this.Start = function (options) {
        return self.start(options)
    };
    this.Stop = function (options) {
        return self.stop(options)
    };

    self.start();
    return Service.call(this, params);
}

Inherit(ConsoleService, Service, {
    error : function (err) {
        this.emit("virtual-error", err);
    },
    start : function(options){
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
    },

    cmd : function(cmd) {
        this.emit("virtual-cmd", cmd);
    },

    stop : function(callback){
        var self = this;
        if (!self.cmdState){
            self.error("trying to stop died VM");
            return;
        }
        if (typeof callback == "function")
            self.once("virtual-exited", callback);
        self.emit("virtual-stop");
    }
});

module.exports = ConsoleService;

