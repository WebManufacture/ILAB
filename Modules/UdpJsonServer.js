/*
 jsonsocket library of smmoosavi, copied by MIT LICENSE
 https://github.com/smmoosavi/jsonsocket
*/
var net = require('net');
var util = require('util');
var EventEmitter = require('events');
const dgram = require('dgram');

function UdpJsonServer(config) {
    var self = this;
    if (!config) config = {};
    if (!config.port) throw new Error("No port specified in config");
    this.config = config;

    const server = this.server = dgram.createSocket('udp4');


    if (config.address){
        server.bind(config.port, config.address);
    } else {
        server.bind(config.port);
    }

    server.on('listening', () => {
        if (typeof config.broadcast == "boolean"){
            server.setBroadcast(config.broadcast);
        }
        self.emit('connect', server);
    });
    server.on('error', (err) => {
        self.emit('error', err);
    });

    server.on('close', function (is_end, err) {
        self.closed = true;
        self.emit('close', is_end, err);
    });

    server.on('message', function (data, rinfo) {
        console.log(data);
        if (rinfo.size > 0) {
            var str = data.toString();
            try {
                str = JSON.parse(str);
            }
            catch (err) {
                self.emit("error", new Error("UDP JSON Error parsing"));
                return;
            }
            self.emit('json', str);
        }
    });


    self.write = self.send = function (data, port, addr) {
        if (!self.closed) {
            if (data != undefined && data != null) {
                server.send(JSON.stringify(data), port, addr);
            }
        }
    };

    self.close = function () {
        server.close();
    };

    return EventEmitter.call(this);
}

util.inherits(UdpJsonServer, EventEmitter);

module.exports = UdpJsonServer;