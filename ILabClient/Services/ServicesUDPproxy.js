var fs = useSystem('fs');
var http = useSystem('http');
var stream = useSystem('stream');
var EventEmitter = useSystem('events');
var HttpRouter = useModule('Router');
var Service = useRoot("/System/Service.js");

UdpProxyService = function(params){
    var result = Service.apply(this, arguments);
    var self = this;
    var port = 52203;
    if (params && params.port) port = params.port;

    const dgram = require('dgram');
    const server = this.udpServer = dgram.createSocket('udp4');

    server.on('error', (err) => {
        console.log(`UdpProxyService says: server error:\n${err.stack}`);
        server.close();
    });

    server.on('message', (msg, rinfo) => {
        console.log(`UdpProxyService got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    });

    server.on('listening', () => {
        const address = server.address();
        console.log(`UdpProxyService listening ${address.address}:${address.port}`);
    });

    server.bind(port);

    return result;
};

Inherit(UdpProxyService, Service, {

});

module.exports = UdpProxyService;