var Path = require('path');
var fs = require('fs');
var http = require('http');
var os = require('os');
var net = require('net');
var vm = require('vm');
var ChildProcess = require('child_process');

function Frame(params){
    this.fm = useSystem("ForkManager");

    this._super();


    process.container = this;
    process.router = this.router;

    this.Nodes = [];
    this.Modules = [];
    this.Services = [];
    this.Childs = [];

    if (this.isChild) {
        this.send({type: "control", state: "loaded", id: this.id, pipe: this.pipeId});
    }

    this.exit = function(){
        if (this.exitingInteval == null) {
            process.emit("exiting");
            var date = (new Date());
            //console.log(process.id + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
            this.exitingInteval = setTimeout(function () {
                process.exit();
            }, 10);
        }
    };

    var wasExiting = false;
    process.once("SIGTERM", () =>{
        if (!wasExiting){
            wasExiting = true;
            this._closeServer();
            this.exit();
        };
    });
    process.once("SIGINT", () =>{
        if (!wasExiting){
            wasExiting = true;
            this._closeServer();
            this.exit();
        };

    });
    process.once("exiting", () =>{
        if (!wasExiting) {
            wasExiting = true;
            this._closeServer();
        }
    });
    process.once("exit", () =>{
        if (!wasExiting){
            wasExiting = true;
            this._closeServer();
        }
        if (this.exitingInteval){
            clearTimeout(this.exitingInteval);
        }
    });

    process.on("message", (message) => {
        this.routeMessage(message);
    });

    process.on("child-message", (cp, message) => {
        this.routeMessage(message);
    });


    this.pipeId = this.getPipe();

    this._pipesServerForBaseInteraction = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    });
    this._pipesServerForBaseInteraction.on("connection", (socket) => {
        this._onConnection(socket);
    });

    process.setMaxListeners(100);
    this._pipesServerForBaseInteraction.on("error", (err) => {
        try {
            this.error(err);
        }
        catch (e){
            console.log(err);
            console.error(e);
        }
    });

    try{
        this._pipesServerForBaseInteraction.listen(this.pipeId, () => {
            console.log("Listening pipe " + this.pipeId);
        });
    }
    catch (error){
        throw ("Cannot start container " + this.id + " on " + this.pipeId + "\n" + error.message);
    }

};

//Оставлено для совместимости!

require(Path.resolve('System/RequireExtention.js'));

Inherit(Frame, useSystem('Container'), {
    _onConnection  : function(socket){
        var self = this;
        //console.log(this.serviceId + ":" + this.port + " connection");
        socket = new JsonSocket(socket);

        var errorHandler = function(err){
            self.emit("error", err);
        };
        socket.on("error", errorHandler);

        var goStreamMode = (message, result) => {
            socket.write({"type": "stream",  id: message.id, length: result.length});
            socket.removeListener('messageHandlerFunction', messageHandlerFunction);
            messageHandlerFunction = (message) => {
                if (message.type == "stream-started"){
                    if (result.encoding){
                        socket.netSocket.setEncoding(result.encoding);
                    }
                    else {
                        socket.netSocket.setEncoding('binary');
                    }
                    if (result instanceof stream.Readable) {
                        result.pipe(socket.netSocket);
                    }
                    if (result instanceof stream.Writable) {
                        socket.netSocket.pipe(result);
                    }
                } else {
                    throw new Error("Reusable socket detected after go stream mode")
                }
            };
            socket.on('json', messageHandlerFunction);

        };

        var messageHandlerFunction = function (message) {
            if (message.type == "method"){
                try {
                    this._calleeFunctionMessage = message;
                    var result = self._callMethod(message.name, message.args);
                    this._calleeFunctionMessage = null;
                }
                catch (err){
                    if (message.id) {
                        socket.write({"type": "error", id: message.id, result: err, message: err.message, stack: err.stack});
                    }
                    return;
                }
                if (result instanceof Promise){
                    result.then(function (result) {
                        try {
                            if (result instanceof stream.Readable || result instanceof stream.Writable) {
                                goStreamMode(message, result);
                            }
                            else {
                                socket.write({"type": "result", id: message.id, result: result});
                            }
                        }
                        catch (error){
                            throw error;
                        }
                    }).catch(function (error) {
                        if (typeof error == "string") {
                            socket.write({"type": "error", id: message.id, result: error, message: error});
                        }
                        else {
                            socket.write({"type": "error", id: message.id, result: error.message, message: error.message, stack: error.stack});
                        }
                    });
                }
                else {
                    if (result instanceof stream.Readable || result instanceof stream.Writable) {
                        goStreamMode(message, result);
                    } else {
                        socket.write({"type": "result", id: message.id, result: result})
                    }
                }
            }
            if (message.type == "startup") {
                var proxy = Service.CreateProxyObject(self);
                if (proxy) {
                    socket.write(proxy);
                }
            }
            if (message.type == "subscribe") {
                self.on("internal-event", internalEventHandler);
            }
        };
        var internalEventHandler = function (eventName, args) {
            //args.shift();
            try {
                if (!socket.closed) {
                    socket.write({
                        type: "event",
                        name: eventName,
                        calleeId: this._calleeFunctionMessage ? this._calleeFunctionMessage.id : null,
                        calleeName: this._calleeFunctionMessage ? this._calleeFunctionMessage.name : null,
                        args: args});
                }
            } catch(err){
                //errorHandler(err);
            }
        };
        var serverClosingHandler = function (eventName, args) {
            socket.end();
        };
        socket.on("json", messageHandlerFunction);
        self.once("closing-server", serverClosingHandler);

        socket.once("close", function (isError) {
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        socket.once("end", function (isError) {
            self.removeListener("internal-event", internalEventHandler);
            self.removeListener("closing-server", serverClosingHandler);
            socket.removeAllListeners();
        });
        process.once("exit", function(){
            socket.end();
            socket.close(true);
        });
    },

    _closeServer : function(){
        this._pipesServerForBaseInteraction.close();
        console.log("exiting:closing " + this.pipeId);
    }
});

Frame._detectDebugMode = function() {
    var debugMode = false;
    try{
        if (process.execArgv[0] && (process.execArgv[0].indexOf("--inspect") >= 0 || process.execArgv[0].indexOf("--debug") >= 0)){
            debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
        }
        for (var i = 2; i <= process.argv.length; i++) {
            var arg = process.argv[i];
            if (!arg) continue;
            if (arg.indexOf("--inspect") >= 0) {
                debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                continue;
            }
        }
        process.debugMode = debugMode;
        // console.log('Frame: servicesToStart ', servicesToStart)
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
    }
};

process.on('uncaughtException', function (ex) {
    console.error(ex);
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

process.once("SIGTERM", process.exit);
process.once("SIGINT", process.exit);

module.exports = Frame;
