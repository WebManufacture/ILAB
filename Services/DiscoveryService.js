var Service = useRoot("/System/Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");
var JsonSocket = useModule('jsonsocket');


function DiscoveryService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = [];
    this.helloInfo = {};

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
    this.CheckNode = function (ipv6, port) {
        return this.tryConnectExternalSM(ipv6, port);
    };
    this.ReCheckHosts = function () {
        return this.recheckNodes();
    };
    if (config.hosts && Array.isArray(config.hosts)) {
        this.recheckNodes(config.hosts);
    }
    return Service.call(this, "DiscoveryService");
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {
    recheckNodes: function (hosts) {
        var self = this;
        hosts.forEach((node)=>{
            this.tryConnectExternalSM(node.host, node.port).then((socket)=>{
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
                    self.emit("connected", proxyObj);
                    var nodeInfo =  {
                        host: node.host,
                        port: node.port,
                        id : proxyObj.id,
                        type: proxyObj.type
                    };
                    self.knownNodes.push(nodeInfo);
                    console.log("Found node: " + proxyObj.id);
                    socket.once("json", function (info) {
                        nodeInfo.info = info;
                        console.log(info);
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
    }
});

module.exports = DiscoveryService;
