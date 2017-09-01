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

    socket.on('data', function (data) {
        var str = data.toString();
        var parts = str.split('\0');
        json += parts.shift();
        while (parts.length > 0) {
            try {
                self.emit('json', JSON.parse(json));
            }
            catch (err) {
                self.emit("error", new Error("JSON Error parsing:\n" + err.stack + "\n" + json))
            }
            json = parts.shift();
        }
    });

    socket.on('end', function (arg1, arg2) {
        self.emit('end', arg1, arg2);
    });

    socket.on('close', function (is_end, err) {
        self.emit('close', is_end, err);
    });

    socket.on('error', function (ex, second) {
        self.emit('error', ex, second);
    });

    self.write = self.send = function (data) {
        if (data != undefined && data != null) {
            socket.write(JSON.stringify(data) + '\0');
        }
        else{
            self.emit("error", new Error("Error sending data"))
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
}

util.inherits(JsonSocket, EventEmitter);

module.exports = JsonSocket;