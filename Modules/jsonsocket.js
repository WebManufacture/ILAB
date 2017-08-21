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

    socket.on('end', function () {
        self.emit('end');
    });

    socket.on('close', function (is_end) {
        self.emit('close', is_end);
    });

    socket.on('error', function (ex) {
        self.emit('error', ex);
    });

    self.write = function (data) {
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

    self.end = function () {
        socket.end();
    };


    self.connect = function () {
        socket.connect.apply(socket, arguments);
    };
}

util.inherits(JsonSocket, EventEmitter);

module.exports = JsonSocket;