var Service = useRoot("/System/Service.js");
useModule("utils.js");

function myService(port){
    this.users = [
        { name : "Igor", status: "offline"},
        { name : "Caroline", status: "online"}
    ];
    var self = this;
    // это публичная функция:
    this.GetUsers = function(status) {
        return self.getUsersList(status);
    };
    this.PushUser = function(user) {
        this.users.push(user);
        this.emit('chat',user);
    };
    return Service.call(this, port, "myService");

}

myService.serviceId = "myService";

Inherit(myService, Service, {
    //... тут какие-то внутренние методы сервиса
    getUsersList : function(status){
        var result = [];
        for(var i=0; i<this.users.length; i++)
            if(this.users[i].status==status) result.push(this.users[i]);
        return result;
    }
});

module.exports = myService;