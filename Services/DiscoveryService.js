var Service = useRoot("/System/Service.js");
useModule("utils.js");
var child = require("child_process");
var net = require("net");
var os = require("os");


function DiscoveryService(params){
    var self = this;
    // это публичная функция:
    
    this.GetARP = function() {
        return new Promise(function (resolve, reject) {
            var hosts = {};
           try {
               child.exec("arp -a", function (err, res) {
                   if (err) reject(err);
                   else {
                       var list = res.split("\n").filter(function (x) {
                           return x !== "";
                       });
                       list.map(function (x) {
                           hosts[x] = x;
                       });
                   }
                   resolve(list, hosts);
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
    return Service.call(this, "DiscoveryService");
}

DiscoveryService.serviceId = "DiscoveryService";

Inherit(DiscoveryService, Service, {
    //... тут какие-то внутренние методы сервиса
    getUsersList : function(status){
        var result = [];
        for(var i=0; i<this.users.length; i++)
            if(this.users[i].status==status) result.push(this.users[i]);
        return result;
    }
});

module.exports = DiscoveryService;
