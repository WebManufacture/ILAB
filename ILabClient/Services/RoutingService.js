var Service = useRoot("/System/Service.js");
useModule("utils.js");
var JsonSocket = useModule('jsonsocket');
var net = useSystem("net");
var os = useSystem("os");


function RoutingService(config){
    var self = this;
    // это публичная функция:

    this.knownNodes = [];
    this.helloInfo = {

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

    var result = Service.apply(this, arguments);

    if (config.hosts && Array.isArray(config.hosts)) {
        this.recheckNodes(config.hosts);
    }

    return result;
};

Inherit(RoutingService, Service, {
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

    connectDiscovery : function(host, port, id, node){
        ServiceProxy.connect(host + ":" + port, id).then((discovery)=>{
            node.service = discovery;
            discovery.RegisterNode(this.helloInfo).then(()=>{

            });
        }).catch((err)=>{

        });
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

module.exports = RoutingService;