var fs = useSystem('fs');
var Async = useModule('async');
var Path = useSystem('path');
var Url = useSystem('url');
var http = useSystem('http');
var https = useSystem('https');
var stream = useSystem('stream');
var EventEmitter = useSystem('events');
var Service = useRoot("/System/Service.js");
var ServiceProxy = useRoot("/System/Service.js");


StorageService = function (params) {
    var result = Service.apply(this, arguments);

};

Inherit(StorageService, Service, {

});

module.exports = StorageService;