var fs = useSystem('fs');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
var os = useSystem("os");
var ChildProcess = useSystem('child-process-debug');
var util = useModule('utils');

function ForkMon(path, args, env){
    this.path = path;
    if (!args) args = [];
    this.env = env;
    this.args = args;
    this.code = ForkMon.STATUS_NEW;
    this.killTimeout = 4000;
    var fork = this;
    EventEmitter.call(this);
    this.on("start", function(message){
        fork.start();
    });
    this.on("stop", function(message){
        fork.stop();
    });
};

ForkMon.Statuses = ["new", "killed", "exited", "paused", "error", "reserved", "stopping", "working"];
ForkMon.STATUS_NEW = 0;
ForkMon.STATUS_KILLED = 1;
ForkMon.STATUS_EXITED = 2;
ForkMon.STATUS_PAUSED = 3;
ForkMon.STATUS_ERROR = 4;
ForkMon.STATUS_STOPPING = 6;
ForkMon.STATUS_WORKING = 7;

Inherit(ForkMon, EventEmitter, {
    start : function(args){
        if (this.code >= ForkMon.STATUS_WORKING){
            return;
        }
        if (typeof (args) == 'function'){
            var callback = args;
        }
        if (!args) args = this.args;
        if (!this.env) this.env = {};
        var cwd =  process.cwd();
        if (this.env && this.env.cwd){
            cwd = args.cwd;
        }
        if (!Array.isArray(args)) args = [JSON.stringify(args)];
        var argsA = args;
        //var debug = process.execArgv.indexOf('--debug');
        //--debug-brk=<free port>
        var cp = this.process = ChildProcess.fork(this.path, argsA, { silent: false, cwd: cwd, env: this.env  });
        this.code = ForkMon.STATUS_WORKING;
        if (callback){
            var fork = this;
            this.once("started", function(){
                callback.call(fork);
            });
        }
        this.emit("started", ForkMon.STATUS_WORKING);
        var fork = this;
        cp.on("exit", function(){
            fork._exitEvent.apply(fork, arguments);
        });
        cp.on("error", function(){
            fork._errorEvent.apply(fork, arguments);
        });
        cp.on("message", function(msg){
            fork._messageEvent.apply(fork, arguments);
        });
        if (global.Frame){
            if (!global.Frame.childProcesses) global.Frame.childProcesses = [];
            global.Frame.childProcesses.push(cp);
            process.on('exit', function () {
                cp.kill();
            });
        }
        return cp;
    },

    stop : function(callback){
        if (this.code < ForkMon.STATUS_WORKING){
            return;
        }
        if (callback){
            var fork = this;
            this.once("exited", function(){
                callback.call(fork, ForkMon.STATUS_EXITED);
            });
        }
        this.code = ForkMon.STATUS_STOPPING;
        this.exit();
    },

    getStatus : function(){
        return ForkMon.Statuses[this.code];
    },

    info : function(){
        var stat = {code : this.code, status : this.getStatus(), path: this.path, args: this.args};
        if (this.process){
            stat.pid = this.process.pid;
        }
        return stat;
    },

    _errorEvent : function(error){
        this.emit("error", error);
    },

    _exitEvent : function(signal){
        this.code = ForkMon.STATUS_EXITED;
        this.emit("exited", ForkMon.Statuses[this.code]);
    },

    _messageEvent : function(obj){
        this.emit("message", obj);
    },

    exit : function(){
        if (this.process){
            var self = this;
            var proc = this.process;
            var exited = false;
            this.process.send("EXIT-REQUEST");
            var exitTimeout = setTimeout(function(){
                if (!exited){
                    self.emit("killing", "ForkMon: " + self.id + " KILLED BY TIMEOUT!");
                    proc.kill('SIGINT');
                    self.emit("exited", ForkMon.STATUS_KILLED);
                }
            }, self.killTimeout);
            proc.once("exit", function(){
                exited = true;
                clearTimeout(exitTimeout);
            });
        }
    }
});

module.exports = ForkMon;
