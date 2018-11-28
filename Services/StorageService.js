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
var Selector = useModule("selectors.js");
var Storage = useModule("storage.js");

StorageService = function (params) {
    var result = Service.apply(this, arguments);
    this.storage = new Storage("/Temp/tempStorage.json", true);

    this.all = function(selector, object) {
        return this.storage.all(selector, object);
    };

    this.get = function(selector, object) {
        return this.storage.get(selector, object);
    };

    this.del = function(selector, object) {
        return this.storage.del(selector, object);
    };

    this.add = function(selector, object) {
        return this.storage.add(selector, object);
    };

    this.set = function(selector, object) {
        return this.storage.set(selector, object);
    };

    this.save = function(selector, object) {
        return this.storage._save(selector, object);
    };

    return result;
};

Inherit(StorageService, Service, {

});

module.exports = StorageService;

