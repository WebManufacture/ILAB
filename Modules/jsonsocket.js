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

    if (arguments[0] instanceof net.Socket) {
        socket = arguments[0];
    } else {
        socket = net.connect.apply(net, arguments);
    }

    this.netSocket = socket;

    socket.on('connect', function () {
        self.emit('connect');
    });

    var dataListener = (data) => {
        if (!this.isStream) {
            var str = data.toString();
            var parts = str.split('\0');
            json += parts.shift();
            while (parts.length > 0) {
                try {
                    json = JSON.parse(json);
                }
                catch (err) {
                    self.emit("error", new Error("Socket JSON Error parsing"));
                    return;
                }
                self.emit('json', json);
                json = parts.shift();
            }
        } else {

        }
    };

    socket.on('data', dataListener);

    socket.on('end', function (arg1, arg2) {
        self.emit('end', arg1, arg2);
    });

    socket.on('close', function (is_end, err) {
        self.closed = true;
        self.emit('close', is_end, err);
    });

    socket.on('error', function (ex, second) {
        if (ex && ex.code != "ECONNRESET") {
            self.emit('error', ex, second);
        }
    });

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

    self.close = function (error) {
        socket.destroy(error);
    };

    self.end = function (param) {
        socket.end(param);
    };


    self.connect = function () {
        socket.connect.apply(socket, arguments);
    };

    self.on('error', function () {

    });
}

util.inherits(JsonSocket, EventEmitter);

module.exports = JsonSocket;