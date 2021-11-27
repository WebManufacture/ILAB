var fs = require('fs');
var Path = require('path');
var EventEmitter = require('events');
var os = require("os");
var ChildProcess = require('child_process');
var util = useModule('utils');

function ForkMon(path, args, env){
    this.path = path;
    if (!args) args = [];
    this.env = env;
    this.args = args;
    this.code = ForkMon.STATUS_NEW;
    this.killTimeout = 1000;
    var fork = this;
    EventEmitter.call(this);
    this.on("start", function(message){
        fork.start();
    });
    this.on("stop", function(message){
        fork.stop();
    });
    process.once("exit", ()=>{
        this.exitImmediate();
    })
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
    start : function(params, callback){
        if (this.code >= ForkMon.STATUS_WORKING){
            throw "trying to start working node";
        }
        if (typeof (params) == 'function'){
            callback = params;
            params = null;
        }
        if (!params) params = {};
        var options = {
            silent: false,
            cwd : process.cwd(),
            env : {
                parentId: Frame.serviceId,
                rootId: Frame.rootId,
                params: JSON.stringify(params)
            }
        };
        if (this.env) {
            for (const key in this.env) {
                if (this.env.hasOwnProperty(key)){
                    options.env[key] = this.env[key];
                }
            }
        }
        if (params && params.cwd){
            options.cwd = params.cwd;
        };
        let debugPort = 0;
        if (Frame.debugMode || params.debug || params.debugMode == "debug"){
            if (process.debugPort){
              debugPort = process.debugPort + Math.floor(Math.random()*1000);
            }
            debugPort = (params.debugPort || parseInt(params.debug)) || debugPort ;
            if (debugPort && !isNaN(debugPort)){
              console.log("debugging uding --inspect-brk=" + debugPort);
              options.execArgv = ["--inspect-brk=" + debugPort];
            } else {
              console.log("debugging uding --inspect");
              options.execArgv = ["--inspect"];
            }
        }
        var cp = this.process = ChildProcess.fork(this.path, this.args, options);
        cp.debugPort = debugPort;
        this.code = ForkMon.STATUS_WORKING;
        cp.on("error", function(err){
            fork._errorEvent.apply(fork, arguments);
        });
        if (callback){
            var fork = this;
            this.once("started", function(){
                callback.call(fork);
            });
        }
        this.emit("started", ForkMon.STATUS_WORKING);
        var fork = this;
        cp.on("exit", function(err){
            fork._exitEvent.apply(fork, arguments);
        });
        cp.on("message", function(msg){
            fork._messageEvent.apply(fork, arguments);
        });
        if (global.Frame){
            if (!global.Frame.childProcesses) global.Frame.childProcesses = [];
            global.Frame.childProcesses.push(cp);
            /*process.once('exit', function () {
                if (!cp.killed){
                    console.log("process-exit:killing cp");
                    cp.kill();
                }
            });*/
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

    getOutputStream: function(){
        if (this.process){
            return this.process.stdout;
        }
        return null;
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
        if (this.process && this.process.connected){
            var self = this;
            var proc = this.process;
            var exited = false;
            try{
              this.process.send("EXIT-REQUEST");
            }catch(err){
              console.log("process-exit:SIGINT");
              self.emit("killing", "ForkMon: " + self.id + " KILLED BY PIPE ERROR!");
              proc.kill('SIGKILL');
              self.emit("exited", ForkMon.STATUS_KILLED);
              return;
            }
            //console.log("process-exit:EXIT-REQUEST");
            var exitTimeout = setTimeout(function(){
                if (!exited){
                    console.log("process-exit:SIGKILL");
                    self.emit("killing", "ForkMon: " + self.id + " KILLED BY TIMEOUT!");
                    proc.kill('SIGKILL');
                    self.emit("exited", ForkMon.STATUS_KILLED);
                }
            }, self.killTimeout);
            proc.once("exit", function(){
                exited = true;
                clearTimeout(exitTimeout);
            });
        }
    },

    exitImmediate : function(){
        if (this.process && this.process.connected){
            var self = this;
            var proc = this.process;
            proc.kill('SIGINT');
        }
    }
});

module.exports = ForkMon;
