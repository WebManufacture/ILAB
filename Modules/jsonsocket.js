/*
 jsonsocket library of smmoosavi, copied by MIT LICENSE
 https://github.com/smmoosavi/jsonsocket
*/
var net = require('net');
var util = require('util');
var EventEmitter = require('events');

function JsonSocket() {
    var self = this;
    var socket = null;
    var json = "";
    var id = (Math.random() + '').replace("0.", "");
    var isStream = false;
    var streamLength = 0;

    if (arguments[0] instanceof net.Socket) {
        socket = arguments[0];
    } else {
        socket = net.connect.apply(net, arguments);
    }

    this.netSocket = socket;

    socket.id = id;

    socket.on('connect', function () {
        self.emit('connect');
    });

    var dataListener = (data) => {
        streamLength += data.length;
        if (!isStream) {
            var str = data.toString();
            var lastIndexOf = 0;
            var index = 0;
            var part = json;

            while ((index = str.indexOf('\0', lastIndexOf)) > lastIndexOf) {
                try {
                    part += str.substring(lastIndexOf, index);
                    streamLength -= part.length + 1;
                    part = JSON.parse(part);
                }
                catch (err) {
                    self.emit("error", new Error("Socket JSON Error parsing"));
                    return;
                }
                self.emit('json', part);
                part = "";
                if (isStream){
                    json = "";
                    return;
                }
                lastIndexOf = index;
            }
            if (lastIndexOf < str.length - 1){
                json = str.substring(lastIndexOf, str.length - 1);
            } else {
                json = '';
            }
        }
    };

    var endListener = function (arg1, arg2) {
        self.emit('end', arg1, arg2);
    };

    socket.on('end', endListener);

    var closeHandler = function (is_end, err) {
        self.closed = true;
        self.emit('close', is_end, err);
        if (isStream) {
            //console.log(" stream closed " + id);
        }
    };

    socket.on('close', closeHandler);

    var errorHandler = function (ex, second) {
        if (ex && ex.code != "ECONNRESET") {
            self.emit('error', ex, second);
        }
    };

    socket.on('error', errorHandler);

    this.goStreamMode = (id) => {
        isStream = true;
        this.netSocket.removeListener('data', dataListener);
        this.netSocket.removeListener('end', endListener);
        var obj = { type : "stream-started"};
        if (id){
            obj.id = id;
        }
        self.send(obj);
        //console.log(this.netSocket.id + " Stream mode " + streamLength);
    };

    socket.on('data', dataListener);

    self.write = self.send = function (data) {
        if (!self.closed) {
            if (data != undefined && data != null) {
                socket.write(JSON.stringify(data) + '\0');
            }
            else {
                self.emit("error", new Error("Error sending data"));
            }
        }
    };

    self.close = (error) => {
        if (this.netSocket) {
            this.netSocket.destroy(error);
            this.netSocket.removeListener('data', dataListener);
            this.netSocket.removeListener('end', endListener);
            this.netSocket.removeListener('close', closeHandler);
            this.netSocket.removeListener('end', errorHandler);
            this.netSocket = null;
            socket = null;
        }
        if (isStream) {
            console.log(id + " stream closed by command  close" + streamLength);
        }
    };

    self.end = (error) => {
        if (this.netSocket) {
            this.netSocket.end(error);
            this.netSocket.removeListener('data', dataListener);
            this.netSocket.removeListener('end', endListener);
            this.netSocket.removeListener('close', closeHandler);
            this.netSocket.removeListener('end', errorHandler);
            this.netSocket = null;
            socket = null;
        }
        if (isStream) {
            console.log(id + " stream closed by command  end" + streamLength);
        }
    };


    self.connect = () => {
        this.netSocket.connect.apply(this.netSocket, arguments);
    };

    self.on('error', () => {

    });
}

util.inherits(JsonSocket, EventEmitter);

module.exports = JsonSocket;