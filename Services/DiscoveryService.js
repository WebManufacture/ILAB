var Service = useSystem("Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");
var EventEmitter = require('events');
var JsonSocket = useModule('jsonsocket');
var UdpJsonServer = useModule('UdpJsonServer');

function UdpServer(localId, netInterface, config) {
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
    close: function(){
        this.udpServer.close();
    },
    broadcastHello : function(toPort){
        if (!toPort) toPort = this.localPort;
        const addressParts = this.localAddress.split(".");
        addressParts[3] = '255';
        this.sendHello(addressParts.join("."), toPort);
    },
    broadcastBye: function(nodes){
        const addressParts = this.localAddress.split(".");
        addressParts[3] = '255';
        this.sendBye(addressParts.join("."), this.localPort, nodes);
    },
    sendBye : function (addressTo, portTo, nodes) {
        this.udpServer.send({
            type: "bye",
            id: this.serviceId,
            myAddress: this.localAddress,
            myPort: this.localPort,
            serviceType: "DiscoveryService",
            localId: this.localId,
            knownNodes: nodes
        }, portTo, addressTo);
        Frame.log("Send BYE! from " + this.localAddress +  " to " + addressTo + ":" + portTo);
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


    this.interfacePoints = [];
    this.serverPool = [];
    this.localId = (Math.random() + "").replace("0.", "");
    this.routerId == "";
    this.maximumCheckTries = config.maximumCheckTries ? config.maximumCheckTries : 4;
    this.knownNodesChecks = {};
    this.serversPollInterval = config.serversPollInterval ? config.serversPollInterval : 5000;
    this.nodesPollInterval = config.nodesPollInterval ? config.nodesPollInterval : 15000;
    this.serverCheckHashes = {};
    this.lastKnownNodesForBye;

    const routingServiceId = config.routingServiceId ? config.routingServiceId:"RoutingService";
    this.connect(routingServiceId).then((service)=>{
      Frame.log("Routing service connected");
      this.routingService = service;
      //Self-Registering to register correct LocalId
      this.routingService.RegisterNode({
          id: this.serviceId,
          type: "local",
          rank: 4,
          serviceType: this.serviceType,
          tcpPort: this.port,
          localId: this.localId
      });
      setInterval(()=>{
          this.recheckConfiguredServers();
      }, this.serversPollInterval);

      setInterval(()=>{
          this.recheckKnownNodes();
      }, this.nodesPollInterval);

      setTimeout(()=>{
        this.recheckConfiguredServers();
        //this.recheckKnownNodes();
      }, 2000)
    });

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
        var server = new UdpServer(this.localId, point, {
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

            server.on("hello", (obj, rinfo) => {
                if (obj.localId == this.localId) return;
                Frame.log("Getting hello from " + rinfo.address + ":" + rinfo.port);
                //Frame.log(obj);
                this.routingService.RegisterNode({
                    id: obj.id,
                    type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
                    rank: rinfo.address == obj.myAddress ? 10: (rinfo.port == obj.myPort ? 20 : 30),
                    serviceType: obj.serviceType,
                    address: rinfo.address,
                    port: rinfo.port,
                    tcpPort: obj.tcpPort,
                    parentId: this.serviceId,
                    parentType: this.serviceType,
                    localId: obj.localId
                }).then((result)=>{
                  server.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
                });
            });
            server.on("see-you", (obj, rinfo) => {
                Frame.log("Getting See-You from " + rinfo.address + ":" + rinfo.port);
                //Frame.log(obj);
                //TODO: Integrate NAT Polling
                this.routingService.RegisterNode({
                    id: obj.id,
                    type: rinfo.address == obj.myAddress ? "direct": (rinfo.port == obj.myPort ? "shadowed" : "hidden"),
                    rank: rinfo.address == obj.myAddress ? 10 : (rinfo.port == obj.myPort ? 20 : 30),
                    serviceType: obj.serviceType,
                    address: rinfo.address,
                    port: rinfo.port,
                    tcpPort: obj.tcpPort,
                    parentId: this.serviceId,
                    parentType: this.serviceType,
                    localId: obj.localId
                }).then((result)=>{
                  server.send(rinfo.address, rinfo.port, {
                      type: "get-known",
                      id: this.serviceId,
                      serviceType: "DiscoveryService",
                      localId: this.localId
                  });
                });
                /*if (rinfo.address != obj.myAddress || rinfo.port != obj.myPort){
                    server.sendSeeyou(rinfo.address, rinfo.port, obj.myAddress, obj.myPort);
                }*/
                //TODO: Add recheck hashes!
            });
            server.on("check-alive", (obj, rinfo) => {
                if (this.debugMode) Frame.log("IsAlive: ", obj);
                this.routingService.CheckAlive(obj).then(alive => {
                  if (!alive){
                    Frame.log("Service Died!", obj)
                  }
                  server.send(rinfo.address, rinfo.port, {
                      type: "is-alive",
                      id: obj.id,
                      serviceType: obj.serviceType,
                      localId: obj.localId,
                      isAlive: alive
                  });
                });
            });
            server.on("is-alive", (obj, rinfo) => {
                delete this.knownNodesChecks[obj.localId];
                if (!obj.isAlive){
                  this.routingService.SetNodeRank(obj, 404);
                } else {
                  if (this.debugMode) Frame.log("Alive: ", obj);
                }
            });
            server.on("bye", (obj, rinfo) => {
                Frame.log("Server said Bye! " + rinfo.address, ":", rinfo.port);
                if (Array.isArray(obj.knownNodes)) {
                    obj.knownNodes.forEach((node) => {
                        this.routingService.SetNodeRank(node, 401);
                    });
                }
            });
            server.on("get-known", (obj, rinfo) => {
                this.routingService.GetKnownNodes().then((nodes)=>{
                  this.lastKnownNodesForBye = nodes.filter(n => n.rank < 100);
                  server.send(rinfo.address, rinfo.port, {
                      type: "i-know",
                      id: this.serviceId,
                      localId: this.localId,
                      serviceType: "DiscoveryService",
                      knownNodes: this.lastKnownNodesForBye
                  });
                });
            });
            //eval("Frame.log('eval')");
            server.on("i-know", (obj, rinfo)=>{
                if (obj.knownNodes) {
                  const nodes = [];
                  if (Array.isArray(obj.knownNodes)) {
                      obj.knownNodes.forEach((node) => {
                          if (node.rank < 100 && node.localId != this.localId){
                            nodes.push({
                                id: node.id,
                                type: "routed",
                                rank: node.type == node.rank < 10 ? 50: 60,
                                address: node.address ? node.address : rinfo.address,
                                port: node.port ? node.port: rinfo.port,
                                serviceType: node.serviceType,
                                tcpPort: node.tcpPort,
                                parentId: this.serviceId,
                                parentType: this.serviceType,
                                localId: node.localId
                            });
                          }
                          /* //For 3d circle of nodes
                          if (result && node.address && node.port && (node.id != self.serviceId)){
                              server.sendHello(node.address, node.port);
                          }*/
                      });
                  }
                  this.routingService.RegisterNodes(nodes).then(registered => {

                  });
                }
            });

            server.on("local", (obj, rinfo) => {
              try {
                  var socket = new JsonSocket(Frame.getPipe(obj.destination), function () {
                      Frame.log("Udp proxying from " + obj.source + " to " + obj.destination);
                      socket.write(obj);
                      socket.end();
                  });
                  socket.on('error', (err) => {
                      Frame.error("Error proxying packet from " + obj.source + " to " + obj.destination, err);
                  });
              }
              catch (err) {
                  Frame.error("Error proxying packet from " + obj.source + " to " + obj.destination, err);
              }
            });

            server.on("tcp-proxy", (obj, rinfo) => {
                try {
                    var socket = new JsonSocket(obj.tcpPort, obj.host, function () {
                        Frame.log("Udp proxying from " + obj.source + " to " + obj.tcpPort + ":" + obj.host);
                        socket.write(obj);
                        socket.end();
                    });
                    socket.on('error', (err)=>{
                        Frame.error("Error proxying packet from "  + obj.source + " to " + obj.tcpPort + ":" + obj.host, err);
                    });
                }
                catch (err) {
                    Frame.error("Error proxying packet from "  + obj.source + " to " + obj.tcpPort + ":" + obj.host, err);
                }
            });

            server.broadcastHello();
            if (config.hosts && Array.isArray(config.hosts)) {
                config.hosts.forEach((remotePoint) => {
                    server.sendHello(remotePoint.address, remotePoint.port);
                });
            }

            process.once("exiting", () => {
              if (this.lastKnownNodesForBye){
                server.broadcastBye(this.lastKnownNodesForBye);
                this.lastKnownNodesForBye.filter(n => n.serviceType == "DiscoveryService" && n.rank >=10 && n.rank < 100).forEach((item, i) => {
                  server.sendBye(item.address, item.port, this.lastKnownNodesForBye);
                });
              }
              server.close();
            });
        });
        Frame.log("Discovery server at " + server.localAddress + ":" + server.localPort);
    });

    this.configuredHosts = config.hosts;

    return result;
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {
    recheckConfiguredServers: function () {
        var self = this;
        this.serverPool.forEach((server)=> {
            if (this.debugMode) Frame.log("rechecking server " + server.localAddress);
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
            this.routingService.GetKnownNodes().then((nodes) => {
              nodes.forEach(node => {
                if (node.port && node.address && node.rank >= 10 && node.rank <= 100) {
                    Frame.log("rechecking known node " + node.localId + " - "+ node.rank + " : " + node.id + ":" + node.serviceType + (node.address ? " from " + node.address + ":" + node.port : "") + " on " + server.localAddress);
                    if (self.knownNodesChecks[node.localId]){
                      self.knownNodesChecks[node.localId]++;
                    } else {
                      self.knownNodesChecks[node.localId] = 1;
                    }
                    if (self.knownNodesChecks[node.localId] > self.maximumCheckTries){
                      Frame.log("Node removed by checks count ", self.knownNodesChecks[node.localId],  node.localId, ":", node.serviceType, "#", node.id)
                      self.routingService.SetNodeRank(node, 404);
                      delete this.knownNodesChecks[node.localId];
                    } else {
                      server.send(node.address, node.port, {
                          type: "check-alive",
                          id: node.id,
                          serviceType: node.serviceType,
                          localId: node.localId
                      });
                    }
                }
              });
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
    }
});

module.exports = DiscoveryService;
