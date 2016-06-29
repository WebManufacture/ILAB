/*
 jsonsocket library of smmoosavi, copied by MIT LICENSE
 https://github.com/smmoosavi/jsonsocket
*/
var net = require('net');
var util = require('util');
var EventEmitter = require('events');

function JsonSocket() {
    var socket = this;
    var connection = null;
    var json = "";

    if (arguments[0] instanceof net.Socket) {
        connection = arguments[0];
    } else {
        connection = net.connect.apply(net, arguments);
    }

    connection.on('connect', function () {
        socket.emit('connect');
    });

    connection.on('data', function (data) {
        var str = data.toString();
        var parts = str.split('\0');
        json += parts.shift();
        while (parts.length > 0) {
            try {
                socket.emit('json', JSON.parse(json));
            }
            catch (err) {
                socket.emit("error", new Error("JSON Error parsing:\n" + err.stack + "\n" + json))
            }
            json = parts.shift();
        }
    });

    connection.on('end', function () {
        socket.emit('disconnect');
    });

    connection.on('error', function (ex) {
        socket.emit('error', ex);
    });

    socket.write = function (data) {
        if (data != undefined && data != null) {
            connection.write(JSON.stringify(data) + '\0');
        }
        else{
            socket.emit("error", new Error("Error sending data"))
        }
    };

    socket.disconnect = function () {
        connection.destroy();
    };

    socket.connect = function () {
        connection.connect.apply(connection, arguments);
    };
}

util.inherits(JsonSocket, EventEmitter);

module.exports = JsonSocket;