var Service = useSystem("Service.js");
useModule("utils.js");

function myService(params){
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
    setInterval(function(){
        self.emit("Time", new Date())
    },1000);
    return Service.call(this, "myService");
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
