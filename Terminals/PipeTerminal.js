var os = require('os');
var net = require('net');
var JsonSocket = useModule('jsonsocket');
var XRouter = useSystem('XRouter');

PipeTerminal= function(params){
    var container = require("container");

    var alreadyExiting = false;

    var exitFunc = () => {
        if (exitingInteval == null) {
            alreadyExiting = true;
            closeFunc();
            process.emit("exiting");
            var date = (new Date());
            //console.log(process.id + " exiting:" + date.toLocaleTimeString() + "." + date.getMilliseconds());
            this.exitingInteval = setTimeout(function () {
                _pipesServerForBaseInteraction.close();
            }, 10);
        }
    };

    process.once("SIGTERM", () =>{
        if (!alreadyExiting){
            exitFunc();
        };
    });
    process.once("SIGINT", () =>{
        if (!alreadyExiting){
            exitFunc();
        };
    });
    process.once("exiting", () =>{
        if (!alreadyExiting) {
            exitFunc();
        }
    });
    container.on("close", () =>{
        if (!alreadyExiting) {
            exitFunc();
        }
    });
    process.once("exit", () =>{
        if (!alreadyExiting){
            exitFunc();
        }
    });

    process.on("message", (message) => {
        this.routeMessage(message);
    });

    process.on("child-message", (cp, message) => {
        this.routeMessage(message);
    });


    getPipe = (serviceId) => {
        return os.type() == "Windows_NT" ? '\\\\?\\pipe\\' + serviceId : '/tmp/ilab-4-' + serviceId;
    };

    var pipeId = params.port ? getPipe(params.port) : getPipe(container.id);

    _pipesServerForBaseInteraction = net.createServer({
        allowHalfOpen: false,
        pauseOnConnect: false
    });

    _pipesServerForBaseInteraction.on("connection", (socket) => {
        _onConnection(socket);
    });

    _pipesServerForBaseInteraction.on("error", (err) => {
        try {
            container.error(err);
        }
        catch (e){
            console.log(err);
            console.error(e);
        }
    });

    _onConnection = (netSocket) => {
        var socket = new JsonSocket(netSocket);

        var errorHandler = function(err){
            self.emit("error", err);
        };
        socket.on("error", errorHandler);

        //TODO: Короче допиливать еще роутинг и допиливать (

        var backMessageHandler = (message) => {
            socket.write(message);
        };

        var messageHandlerFunction = function (message) {
            if (message.source){
                //Подписка на обратную отправку чего-либо
                container.register(message.source, backMessageHandler);
            }
            if (message.type == "method"){
                container.route(XRouter.TYPE_CALL, message.name, message.arguments);
                return;
            }
            if (message.type == "startup" || message.type == XRouter.TYPE_HI) {
                socket.write(container.getDescription());
                return;
            }
            if (message.type == "subscribe") {
                container.on(message.path, eventSubscription);
                return;
            }
            if (message.type == "stream" || message.type == "tunnel") {
                //Реализовать обработку туннелей если это не
                return;
            }
            container.route(message.type, message.path, message.arguments);
        };
        var eventSubscription = () => {
            socket.write({
                from: container.selector,
                type: 'event',
                arguments: arguments
            });
        };
        var closingHandler = () => {
            container.off(eventSubscription);
            container.off(backMessageHandler);
        };
        socket.on("json", messageHandlerFunction);
        container.on("close", ()=>{
            socket.end();
        });
        socket.once("close", function (isError) {
            closingHandler();
        });
        socket.once("end", function (isError) {
            closingHandler();
        });
        process.once("exit", function(){
            netSocket.end();
            netSocket.close(true);
        });
    };

    return new Promise((resolve, reject) => {
        try{
            _pipesServerForBaseInteraction.listen(pipeId, () => {
                console.log(`Container ${container.selector} listening ${pipeId}`);
                resolve();
            });
        }
        catch (error){
            reject("Cannot start container " + container.selector + " on " + pipeId + "\n" + error.message);
        }
    });
};
module.exports = PipeTerminal;