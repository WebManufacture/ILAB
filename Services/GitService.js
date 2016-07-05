var fs = useSystem('fs');
var Service = useModule('Service');
var ServiceProxy = useModule('ServiceProxy');
// var FilesService = useModule('FilesService');

var GitService = function (port) {
    console.log("Git service on port %d", port);
    return Service.apply(this, arguments);
};

// global.GitService.Type = "gitService";

Inherit(GitService, Service, {
    getName: function () {
        return "Name is 'Git service' on port " + this.port;
    }
});

module.exports = GitService;