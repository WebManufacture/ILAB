useModule('utils');
var Service = useRoot("/System/Service.js");

function myService(port) {
    this.users = [
        { name: "Igor", status: "offline" },
        { name: "Caroline", status: "online" }
    ];
    var self = this;
    // это публичная функция:
    this.GetUsers = function(status) {
        return new Promise(function(resolve, reject) { resolve(self.getUsersList(status)) });
    };
    return Service.call(this, port, "myService");
}

myService.serviceId = "Id_testForConfig";

Inherit(myService, Service, {
    getUsersList: function(status) {
        var result = [];
        for (var i = 0; i < this.users.length; i++)
            if (this.users[i].status == status) result.push(this.users[i]);
        return result;
    }
})

module.exports = myService;