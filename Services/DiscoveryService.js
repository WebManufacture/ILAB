var Service = useRoot("/System/Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");
var EventEmitter = useSystem('events');
var JsonSocket = useModule('jsonsocket');
var UdpJsonServer = useModule('UdpJsonServer');

function UdpServer(netInterface, config) {
    this._super.apply(this);
    this.knownNodes = [];
    this.serviceId = config.serviceId || "DiscoveryService";
    this.localPort = config.port || 31337;
    this.remotePort = this.localPort;
    this.localAddress = netInterface.address;
    this.remoteAddress = netInterface.address;
    this.udpServer = new UdpJsonServer({port: this.localPort, address: this.localAddress, broadcast: true});
    this.udpServer.once("connect", ()=>{
        this.myLocalAddress = this.udpServer.address().address;
        Frame.log("My local address " + this.myLocalAddress);
    });
    this.udpServer.on("json", (obj, rinfo) => {
        if (obj && obj.type == "hello"){
            Frame.log("Getting hello from " + rinfo.address + ":" + rinfo.port);
            Frame.log(obj);
            this.sendSeeyou(rinfo.address, rinfo.port, obj.thisAddress, obj.thisPort, this.myAddress);
            this.emit("new-node", obj);
            return;
        }
        if (obj && obj.type == "see-you" || obj.type == "see-nat"){
            Frame.log("Getting see-you from " + rinfo.address + ":" + rinfo.port);
            Frame.log(obj);
            this.emit("new-node", obj);
            if (obj.type == "see-nat"){
                this.remoteAddress = obj.yourAddr;
                this.emit("address-changed", this.remoteAddress);
                Frame.log("my address " + this.myAddress);
            }
            this.knownNodes.push(obj);
        }
    });
}

Inherit(UdpServer, EventEmitter, {
    broadcastHello : function(toPort){
        if (!toPort) toPort = this.localPort;
        const addressParts = this.localAddress.split(".");
        addressParts[3] = '255';
        this.sendHello(addressParts.join("."), toPort);
    },
    sendHello : function (addressTo, portTo) {
        Frame.log("Send hello to " + addressTo + ":" + portTo);
        this.udpServer.send({
            type: "hello",
            id: this.serviceId,
            localAddress: this.localAddress,
            remoteAddress: this.remoteAddress,
            localPort: this.localPort,
            remotePort: this.remotePort,
            tcpPort: this.port,
            serviceType: "DiscoveryService",
            parentId: ServicesManager.serviceId,
            parentPort: Frame.servicesManagerPort
        }, portTo, addressTo);
    },
    sendSeeyou : function (addressTo, portTo, addressFrom, portFrom, addressMe) {
        this.udpServer.send({
            type: addressTo == addressFrom && portTo == portFrom ? "see-you" : "see-nat",
            id: this.serviceId,
            thisAddress: addressMe,
            thisPort: this.lookupPort,
            sentAddress: addressFrom,
            yourAddr: addressTo,
            yourPort: portTo,
            tcpPort: this.port,
            serviceType: "DiscoveryService",
            parentId: ServicesManager.serviceId,
            parentPort: Frame.servicesManagerPort
        }, portTo, addressTo);
    }
});

function DiscoveryService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = [];

    this.GetKnownNodes = function() {
        return this.knownNodes;
    };
    this.GetARP = function() {
        return new Promise(function (resolve, reject) {
           var hosts = [];
           try {
               child.exec("arp -a", function (err, res) {
                   if (err) reject(err);
                   else {
                       var list = res.split("\n").filter(function (x) {
                           return x !== "";
                       });
                       for(var i = 3; i < list.length; i++){
                           var items = list[i].split(/\s+/ig).filter((x)=>x !== "");
                           hosts.push({
                               ip4: items[0],
                               ip6: items[1],
                               type: items[2]
                           });
                       }
                       resolve(hosts);
                   }
               });
           }
           catch (err){
               reject(err);
           }
        });
    };
    this.RegisterNode = function(info){
        if (this.knownNodes.indexOf(s => s.id == info.id) < 0){
            this.knownNodes.push(info);
        }
    };
    this.GetInterfaces = function() {
        return os.networkInterfaces();
    };

    var result = Service.apply(this, arguments);

    this.interfacePoints = [];
    this.serverPool = [];
    /*
        {
            name: "Wi-Fi",
            address:"fe80::d969:68fc:938:ca1b",
            netmask:"ffff:ffff:ffff:ffff::",
            family:"IPv6",
            mac:"7c:5c:f8:3f:ed:55",
            scopeid:16,
            internal:false,
            cidr:"fe80::d969:68fc:938:ca1b/64",
        }
    */

    var interfaces = os.networkInterfaces();
    for (var item in interfaces){
        interfaces[item].forEach((config) => {
            if (!config.internal && config.mac != "00:00:00:00:00:00" && config.family != "IPv6"){
                config.name = item;
                this.interfacePoints.push(config);
            }
        });
    };

    this.interfacePoints.forEach((point) =>{
        var server = new UdpServer(point, {
            port: config.port,
            serviceId: this.serviceId
        });
        this.serverPool.push(server);
        server.broadcastHello();
        Frame.log("Discovery server at " + server.localAddress + ":" + server.localPort);
    });

    if (config.hosts && Array.isArray(config.hosts)) {
        config.hosts.forEach((remotePoint) => {
            this.serverPool.forEach((server) =>{
                server.sendHello(remotePoint.address, remotePoint.port);
            });
        });
    }

    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {

});

module.exports = DiscoveryService;
