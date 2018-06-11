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
    this.helloInfo = {
        type: "hello",
        id: this.serviceId,
        tcpPort: this.port,
        serviceType: "DiscoveryService",
        parentId: ServicesManager.serviceId,
        parentPort: Frame.servicesManagerPort
    };

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

    this.udpPort = config.udpPort || 37331;

    this.udpServer = new UdpJsonServer({port: this.udpPort, broadcast: false, address: "127.0.0.1"});
    this.udpServer.on("json", function (obj, rinfo) {
        console.log(obj);
        console.log(rinfo);
        if (obj && obj.type == "hello"){
            this.udpServer.send({
                ...this.helloInfo,
                type: "see-you"
            }, rinfo.port, rinfo.address);
        }
    });

    console.log("Discovery service at " + this.udpPort);

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
        interfaces[item].forEach((config)=>{
            if (config.address == "127.0.0.1" || !config.internal && config.mac != "00:00:00:00:00:00" && config.family != "IPv6"){
                config.name = item;
                this.interfacePoints.push(config);
            }
        });
    };

    this.interfacePoints.forEach((point)=>{
        const addressParts = point.address.split(".");
        addressParts[3] = '255';
        console.log("Send hello to " + addressParts.join(".") + ":" + 31337);
        this.udpServer.send(this.helloInfo, 31337, addressParts.join("."));
    });

    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {

});

module.exports = DiscoveryService;
