var Service = useRoot("/System/Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");
var JsonSocket = useModule('jsonsocket');
var UdpJsonServer = useModule('UdpJsonServer');


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
    this.ReCheckHosts = function () {
        return this.recheckNodes();
    };

    var result = Service.apply(this, arguments);

    this.helloInfo = {
        type: "hello",
        id: this.serviceId,
        tcpPort: this.port,
        serviceType: "DiscoveryService",
        parentId: ServicesManager.serviceId,
        parentPort: Frame.servicesManagerPort
    };

    this.seeYouInfo = {
        type: "see-you",
        id: this.serviceId,
        tcpPort: this.port,
        serviceType: "DiscoveryService",
        parentId: ServicesManager.serviceId,
        parentPort: Frame.servicesManagerPort
    };


    this.udpPort = config.udpPort || 31337;

    this.udpServer = new UdpJsonServer({port: this.udpPort, broadcast: true});
    this.udpServer.on("json", (obj, rinfo) => {
        if (obj && obj.type == "hello"){
            Frame.log("Getting hello from " + rinfo.address + ":" + rinfo.port);
            Frame.log(obj);
            this.udpServer.send(this.seeYouInfo, rinfo.port, rinfo.address);
        }
        if (obj && obj.type == "see-you"){
            Frame.log("Getting see-you from " + rinfo.address + ":" + rinfo.port);
            Frame.log(obj);
            this.knownNodes.push(obj);
        }
    });

    Frame.log("Discovery service at " + this.udpPort);

    this.interfacePoints = [];
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


    this.lookupPort = 31337;

    this.udpServer.send(this.helloInfo, this.lookupPort, "192.168.0.101");


    this.interfacePoints.forEach((point) =>{
        const addressParts = point.address.split(".");
        addressParts[3] = '255';
        console.log("Send hello to " + addressParts.join(".") + ":" + this.lookupPort);
        this.udpServer.send(this.helloInfo, this.lookupPort, addressParts.join("."));
    });

    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {

});

module.exports = DiscoveryService;
