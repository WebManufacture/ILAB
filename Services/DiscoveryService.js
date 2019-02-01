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
    var self = this;
    this.tcpPort = config.tcpPort;
    this.serviceId = config.serviceId || "DiscoveryService";
    this.localPort = config.port || 31337;
    this.remotePort = this.localPort;
    this.localAddress = netInterface.address;
    this.remoteAddress = netInterface.address;
    this.udpServer = new UdpJsonServer({port: this.localPort, address: this.localAddress, broadcast: true});
    this.udpServer.once("connect", ()=>{
        this.myLocalAddress = this.udpServer.address().address;
        Frame.log("My local address " + this.myLocalAddress);
        this.emit("ready");
    });
    this.udpServer.on("json", (obj, rinfo) => {
        if (obj && obj.type) {
            this.emit(obj.type, obj, rinfo);
        }
    });

    this.on("hello", (obj, rinfo) => {
        if (obj.id == this.serviceId) return;
        Frame.log("Getting hello from " + rinfo.address + ":" + rinfo.port);
        Frame.log(obj);
        this.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
        this.emit("new-node", {
            id: obj.id,
            type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
            serviceType: obj.serviceType,
            address: rinfo.address,
            port: rinfo.port,
            tcpPort: obj.tcpPort,
            managerId: obj.parentId,
            managerPort: obj.parentPort
        });
    });
    this.on("see-you", (obj, rinfo) => {
        Frame.log("Getting See-You from " + rinfo.address + ":" + rinfo.port);
        Frame.log(obj);
        this.emit("new-node", {
            id: obj.id,
            type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
            serviceType: obj.serviceType,
            address: rinfo.address,
            port: rinfo.port,
            tcpPort: obj.tcpPort,
            managerId: obj.parentId,
            managerPort: obj.parentPort
        });
        if (rinfo.address != obj.myAddress || rinfo.port != obj.myPort){
            this.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
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
        Frame.log("Send hello from " + this.localAddress +  " to " + addressTo + ":" + portTo);
        this.udpServer.send({
            type: "hello",
            id: this.serviceId,
            myAddress: this.localAddress,
            myPort: this.localPort,
            tcpPort: this.tcpPort,
            serviceType: "DiscoveryService",
            parentId: ServicesManager.serviceId,
            parentPort: Frame.servicesManagerPort
        }, portTo, addressTo);
    },
    sendSeeyou : function (addressTo, portTo, addressFrom, portFrom) {
        this.udpServer.send({
            type: "see-you",
            id: this.serviceId,
            myAddress: this.localAddress,
            myPort: this.localPort,
            sentAddress: addressFrom,
            sentPort: portFrom,
            yourAddress: addressTo,
            yourPort: portTo,
            tcpPort: this.tcpPort,
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
        if (self.knownNodes.indexOf(s => s.id == info.id) < 0){
            self.knownNodes.push(info);
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
            name: point.name,
            ip: point.address,
            mask: point.mask,
            mac: point.mac,
            port: config.port,
            tcpPort: this.port,
            serviceId: this.serviceId
        });
        this.serverPool.push(server);
        server.once("ready", ()=>{
            server.broadcastHello();
            if (config.hosts && Array.isArray(config.hosts)) {
                config.hosts.forEach((remotePoint) => {
                    server.sendHello(remotePoint.address, remotePoint.port);
                });
            }
        });
        server.on("new-node", (nfo)=>{
            this.RegisterNode(nfo);
            console.log("registered node " + nfo.serviceType + "#" + nfo.id);
        });
        Frame.log("Discovery server at " + server.localAddress + ":" + server.localPort);
    });

    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {
    recheckNodes: function (hosts) {
        var self = this;
        hosts.forEach((node)=>{
            self.udpServer.send("HI!", 41234, node.host);
            self.tryConnectExternalSM(node.host, node.port).then((socket)=>{
                socket = new JsonSocket(socket);
                socket.write({"type": "startup", args: this.helloInfo});
                function raiseError(err) {
                    console.log("Socket error while attach to " + node.host + ":" + node.port);
                    console.error(err);
                    socket.removeAllListeners();
                    socket.close();
                }
                socket.on('error', raiseError);
                socket.once("json", function (proxyObj) {
                    node.proxy = proxyObj;
                    var nodeInfo =  {
                        host: node.host,
                        port: node.port,
                        id : proxyObj.serviceId,
                        type: proxyObj.type
                    };
                    self.knownNodes.push(nodeInfo);
                    self.emit("connected", proxyObj);
                    console.log("Found node: " + proxyObj.serviceId);
                    socket.once("json", function (info) {
                        if (info && info.result) {
                            nodeInfo.info = info.result;
                            //console.log(info.result);
                            var discoveries = info.result.filter(s => s.serviceType == "DiscoveryService");
                            if (discoveries.length){
                                console.log("Found discovery");
                                console.log(discoveries);
                                discoveries.forEach((info)=>{
                                    self.connectDiscovery(node.host, info.port, info.resultId, nodeInfo);
                                });
                            }
                        }
                        socket.close();
                    });
                    socket.write({type: "method", name : "GetServicesInfo"});
                });
            }).catch(err => {
                this.emit('socket-error', 'error connection to ' + node.host + ":" + node.port);
                this.emit('socket-error', err);
            });
        });
        return null;
    },


    tryConnectExternalSM: function(host, port){
        return new Promise((resolve, reject)=> {
            try {
                var socket = net.createConnection(port, host, function () {
                    socket.removeAllListeners();
                    resolve(socket);
                });
                socket.on('error', (err)=>{
                    reject(err);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    },

    connectDiscovery : function(host, port, id, node){
        ServiceProxy.connect(host + ":" + port, id).then((discovery)=>{
            node.service = discovery;
            discovery.RegisterNode(this.helloInfo).then(()=>{

            });
        }).catch((err)=>{

        });
    },
});

module.exports = DiscoveryService;
