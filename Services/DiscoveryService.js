var Service = useSystem("Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");
var EventEmitter = require('events');
var JsonSocket = useModule('jsonsocket');
var UdpJsonServer = useModule('UdpJsonServer');

function UdpServer(netInterface, config, localId) {
    this._super.apply(this);
    var self = this;
    this.localId = localId;
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
}

Inherit(UdpServer, EventEmitter, {
    send: function(addressTo, portTo, message){
        return this.udpServer.send(message, portTo, addressTo);
    },
    broadcastHello : function(toPort){
        if (!toPort) toPort = this.localPort;
        const addressParts = this.localAddress.split(".");
        addressParts[3] = '255';
        this.sendHello(addressParts.join("."), toPort);
    },
    sendHello : function (addressTo, portTo, localId) {
        Frame.log("Send hello from " + this.localAddress +  " to " + addressTo + ":" + portTo);
        this.udpServer.send({
            type: "hello",
            id: this.serviceId,
            myAddress: this.localAddress,
            myPort: this.localPort,
            tcpPort: this.tcpPort,
            serviceType: "DiscoveryService",
            parentId: ServicesManager.serviceId,
            parentPort: Frame.servicesManagerPort,
            localId: this.localId
        }, portTo, addressTo);
    },
    sendSeeyou : function (addressTo, portTo, addressFrom, portFrom, localId) {
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
            parentPort: Frame.servicesManagerPort,
            localId: this.localId
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

    this.GetInterfaces = function() {
        return os.networkInterfaces();
    };

    var result = Service.apply(this, arguments);

    const routingServiceId = config.routingServiceId ? config.routingServiceId:"RoutingService";
    this.connect(routingServiceId).then((service)=>{
      Frame.log("Routing service connected");
      this.routingService = service;
    });

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
    this.localId = (Math.random() + "").replace("0.", "");

    this.registerNode({
        id: this.serviceId,
        type: "self",
        rank: 1,
        serviceType: "DiscoveryService",
        tcpPort: this.port,
        localId: this.localId
    });

    this.routerId == "";

    ServicesManager.GetServicesInfo().then((services)=>{
        services.forEach((service)=> {
            if (service.serviceType == "RoutingService"){
                this.routerId = service.id;
            }
            this.registerNode({
                id: service.resultId,
                type: "local",
                rank: 2,
                serviceType: service.serviceType,
                tcpPort: service.port,
                localId: (Math.random() + "").replace("0.", "")
            });
        });
    });

    ServicesManager.on("service-started", (serviceId, config, description) => {
        if (service.serviceType == "RoutingService"){
            this.routerId = serviceId;
        }
        this.registerNode({
            id: serviceId,
            type: "local",
            rank: 5,
            serviceType: description.serviceType,
            tcpPort: description.tcpPort,
            localId: (Math.random() + "").replace("0.", "")
        });
    });

    ServicesManager.on("service-exited",(serviceId, servicePort) => {
        const ind = this.knownNodes.findIndex((item) => item && item.id == serviceId && item.rank < 10);
        if (ind >= 0) {
          this.knownNodes.splice(ind, 1);
        }
    });

    var interfaces = os.networkInterfaces();
    for (var item in interfaces){
        interfaces[item].forEach((config) => {
            console.log(config)
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
        }, this.localId);
        this.serverPool.push(server);
        server.once("ready", ()=>{
            server.on("hello", (obj, rinfo) => {
                if (obj.id == this.serviceId && obj.myAddress == point.address) return;
                Frame.log("Getting hello from " + rinfo.address + ":" + rinfo.port);
                //Frame.log(obj);
                server.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
                this.registerNode( {
                    id: obj.id,
                    type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
                    rank: rinfo.address == obj.myAddress ? 10: (rinfo.port == obj.myPort ? 20 : 30),
                    serviceType: obj.serviceType,
                    address: rinfo.address,
                    port: rinfo.port,
                    tcpPort: obj.tcpPort,
                    managerId: obj.parentId,
                    managerPort: obj.parentPort,
                    localId: obj.localId
                });
            });
            server.on("see-you", (obj, rinfo) => {
                Frame.log("Getting See-You from " + rinfo.address + ":" + rinfo.port);
                //Frame.log(obj);
                this.registerNode({
                    id: obj.id,
                    type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
                    rank: rinfo.address == obj.myAddress ? 10: (rinfo.port == obj.myPort ? 20 : 30),
                    serviceType: obj.serviceType,
                    address: rinfo.address,
                    port: rinfo.port,
                    tcpPort: obj.tcpPort,
                    managerId: obj.parentId,
                    managerPort: obj.parentPort,
                    localId: obj.localId
                });
                /*if (rinfo.address != obj.myAddress || rinfo.port != obj.myPort){
                    server.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
                }*/
                server.send(rinfo.address, rinfo.port, {
                    type: "get-known",
                    id: this.serviceId,
                    serviceType: "DiscoveryService",
                    localId: this.localId
                });
            });
            server.on("check-alive", (obj, rinfo) => {
                console.log("check-Alive", obj);
                server.send(rinfo.address, rinfo.port, {
                    type: "is-alive",
                    id: this.serviceId,
                    serviceType: "DiscoveryService",
                    localId: obj.localId,
                    isAlive: this.knownNodes.findIndex(n => n.localId == obj.localId) >= 0
                });
            });
            server.on("is-alive", (obj, rinfo) => {
                if (!obj.isAlive){
                  const exId = this.knownNodes.findIndex(n => n.localId == obj.localId);
                  if (exId >= 0){
                    console.log("Died!", this.knownNodes[exId]);
                    this.knownNodes.splice(exId, 1);
                  }
                }
            });
            server.on("get-known", (obj, rinfo) => {
                server.send(rinfo.address, rinfo.port, {
                    type: "i-know",
                    id: this.serviceId,
                    serviceType: "DiscoveryService",
                    knownNodes: this.knownNodes
                });
            });
            //eval("console.log('eval')");
            server.on("i-know", (obj, rinfo)=>{
                if (obj.knownNodes) {
                    if (Array.isArray(obj.knownNodes)) {
                        obj.knownNodes.forEach((node) => {
                            var result = this.registerNode({
                                id: node.id,
                                type: "routed",
                                rank: node.type == node.rank < 10 ? 50: 60,
                                address: node.address ? node.address : rinfo.address,
                                port: node.port ? node.port: rinfo.port,
                                serviceType: node.serviceType,
                                tcpPort: node.tcpPort,
                                parentId: obj.id,
                                parentType: obj.serviceType,
                                localId: obj.localId
                            });
                            if (result && node.address && node.port && (node.id != self.serviceId)){
                                //console.log(node);
                                server.sendHello(node.address, node.port);
                            }
                        });
                    } else {
                        for (var item in obj.knownNodes){
                            var node = obj.knownNodes[item];
                            var result = this.registerNode({
                                id: node.id,
                                type: "routed",
                                rank: node.type == node.rank < 10 ? 50: 60,
                                address: node.address ? node.address : rinfo.address,
                                port: node.port ? node.port: rinfo.port,
                                serviceType: node.serviceType,
                                tcpPort: node.tcpPort,
                                parentId: obj.id,
                                parentType: obj.serviceType,
                                localId: obj.localId
                            });
                        }
                    }
                }
            });

            server.on("local", (obj, rinfo) => {
                var destination = obj.destinationId;
                var node = this.knownNodes.find(n => n.id == destinationId);
                if (node){
                    if (node.type == "local"){
                        try {
                            var socket = new JsonSocket(Frame.getPipe(obj.to), function () {
                                Frame.log("Udp proxying from " + obj.sourceId + " to " + destinatio);
                                socket.write(obj);
                                socket.end();
                            });
                            socket.on('error', (err) => {
                                Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                            });
                        }
                        catch (err) {
                            Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                        }
                    }
                }
            });

            server.on("proxy", (obj, rinfo) => {
                var destination = obj.destinationId;
                var node = this.knownNodes.find(n => n.id == destinationId);
                if (node){
                    if (node.type == "local"){
                        try {
                            if (this.routerId) {
                                var socket = new JsonSocket(Frame.getPipe(this.routerId), function () {
                                    Frame.log("Udp proxying from " + obj.sourceId + " to " + destinatio);
                                    socket.write(obj);
                                    socket.end();
                                });
                                socket.on('error', (err) => {
                                    Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                                });
                            }
                        }
                        catch (err) {
                            Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                        }
                    }
                }
            });

            server.on("tcp-proxy", (obj, rinfo) => {
                var destination = obj.destinationId;
                var node = this.knownNodes.find(n => n.id == destinationId);
                if (node){
                    if (node.type == "local"){
                            try {
                                var socket = new JsonSocket(node.tcpPort, obj.host, function () {
                                    Frame.log("Udp proxying from " + obj.sourceId + " to " + destinatio);
                                    socket.write(obj);
                                    socket.end();
                                });
                                socket.on('error', (err)=>{
                                    Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                                });
                            }
                            catch (err) {
                                Frame.error("Error proxying packet from " + obj.sourceId + " to " + destination, err);
                            }
                    }
                }
            });

            server.broadcastHello();
            if (config.hosts && Array.isArray(config.hosts)) {
                config.hosts.forEach((remotePoint) => {
                    server.sendHello(remotePoint.address, remotePoint.port);
                });
            }
        });
        Frame.log("Discovery server at " + server.localAddress + ":" + server.localPort);
    });

    this.configuredHosts = config.hosts;

    setInterval(()=>{
        this.recheckConfiguredServers();
    }, 16000);

    setInterval(()=>{
        this.recheckKnownNodes();
    }, 10000);

    setTimeout(()=>{
      this.recheckConfiguredServers();
      //this.recheckKnownNodes();
    }, 2000)
    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {

    registerNode : function(nfo){
        if (nfo && nfo.id){
            var existingInd = this.knownNodes.findIndex(n => (n.id == nfo.id) && (nfo.localId ? n.localId == nfo.localId : true));
            if (this.routerId) {
                this.routeLocal(this.routerId, {
                    type: "method",
                    name: "RegisterNode",
                    args: [{
                        id: nfo.id,
                        rank: 60,
                        type: "routed",
                        providerId: this.serviceId,
                        serviceType: nfo.serviceType,
                        data: nfo
                    }]
                });
            }
            if (existingInd < 0) {
                if (!nfo.localId){
                  nfo.localId = (Math.random() + "").replace("0.", "");
                }
                Frame.log("registered node " + nfo.localId + " - " + nfo.rank + ":" + nfo.type + ":" + nfo.serviceType + "#" + nfo.id);
                this.knownNodes.push(nfo);
                return true;
            } else {
                var existing = this.knownNodes[existingInd];
                if (existing && existing.rank > nfo.rank) {
                    if (!nfo.localId){
                      nfo.localId = (Math.random() + "").replace("0.", "");
                    }
                    Frame.log("replacing node " + existing.localId + " -> " + nfo.localId + " - " + nfo.id + " from " + existing.rank + ":" + existing.type + ":" + existing.parentId + " to " + nfo.rank + ":" + nfo.type + "#" + (nfo.parentId ? nfo.parentId : nfo.id));
                    this.knownNodes[existingInd] = nfo;
                    return true;
                }
            }
        }
        return false;
    },

    recheckConfiguredServers: function () {
        var self = this;
        this.serverPool.forEach((server)=> {
            Frame.log("rechecking server " + server.localAddress);
            server.broadcastHello();
            if (this.configuredHosts && Array.isArray(this.configuredHosts)) {
                this.configuredHosts.forEach((remotePoint) => {
                    server.sendHello(remotePoint.address, remotePoint.port);
                });
            }
        });
        return null;
    },

    recheckKnownNodes: function () {
        var self = this;
        this.serverPool.forEach((server)=> {
            this.knownNodes.forEach((node) => {
              if (node.port && node.address && node.rank > 10 && node.id != self.serviceId) {
                  Frame.log("rechecking known node " + node.localId + " - "+ node.rank + " : " + node.id + ":" + node.serviceType + (node.address ? " from " + node.address + ":" + node.port : "") + " on " + server.localAddress);
                  server.send(node.address, node.port, {
                      type: "check-alive",
                      id: this.serviceId,
                      serviceType: "DiscoveryService",
                      localId: node.localId
                  });
              }
            });
        });
        return null;
    },


    recheckOld: function (hosts) {
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
