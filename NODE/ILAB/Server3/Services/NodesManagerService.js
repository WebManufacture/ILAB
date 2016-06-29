var fs = useSystem('fs');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
var os = useSystem("os");
var ChildProcess = useSystem('child_process');
var util = useModule('utils');
var ForkMon = useModule("forkmon");
var Service = useModule("Service");

function NodesManagerService(port){
    this.nodes = {};
    var self = this;
    this.StartNode = function(nodePath){
        var node = self.startNode(nodePath);
        node.on("started", function(){
        });
        return "started";
    };
    return Service.call(this, port, "NodesManagerService");
}

Inherit(NodesManagerService, Service, {

    startNode : function(nodeId, workingDir){
        if (!nodeId) return;
        var self = this;
        if (!this.nodes[nodeId]) {
            var nodePath = nodeId;
            if (nodePath.indexOf(".js") != nodePath.length - 3){
                nodePath += ".js";
            }
            nodePath = Path.resolve(nodePath);
            var env = { workDir : workingDir, nodeName : nodeId, nodePath : nodePath, managerPort : Frame.servicesManagerPort};
            var fork = new ForkMon(Frame.NodesPath + "NodeFrame.js", null, env);
            fork.on("error", function(err){
                err.nodeId = nodeId;
                self.emit("error", err);
            });
            fs.stat(nodePath, function(err, stats){
                if (!err){
                    self.nodes[nodeId] = fork;
                    self.startNode(nodeId, workingDir);
                }
                else{
                    self.emit("error", new Error("Node " + nodeId + " open error! " + err));
                }
            });
            return fork;
        };
        var node = this.nodes[nodeId];
        if (node.code < ForkMon.STATUS_WORKING) {
            node.start();
        }
        else{
            this.emit("error", new Error("Node " + nodeId + " already work!"));
        }
        return node;
    },

    stopNode : function(nodeId) {
        if (isNodeAvailable(nodeId)) {
            this.nodes[nodeId].stop();
        }
    },

    getContract : function(nodeName){
        var me = this;
        if (IsNodeLoaded(nodeName)){
            return this.nodes[nodeName].getContract();
        }
        return null;
    },

    getNodes : function(){
        var nodes = [];
        for (var s in this.nodes){
            if (this.nodes[name] != null){
                nodes.push(s);
            }
        }
        return nodes;
    },

    getProxy : function(nodeId){

    },

    isNodeAvailable : function(name){
        return (this.nodes[name] && this.nodes[name].code == ForkMon.STATUS_WORKING);
    },

    isNodeLoaded : function(name){
        return this.nodes[name] != undefined && this.nodes[name] != null;
    }
});

module.exports = NodesManagerService;