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
    this.storage = new Storage(Path.resolve(Frame.ilabPath + "/Temp/tempStorage.json"), true);

    this.all = function(selector, object) {
        return this.storage.all(selector, object);
    };

    this.get = function(selector, object) {
        return this.storage.get(selector, object);
    };

    this.del = function(selector, object) {
        var result = this.storage.del(selector, object);
        this.emit("del", selector, result);
        return result;
    };

    this.add = function(selector, object) {
        var result = this.storage.add(selector, object);
        this.emit("add", result);
        return result;
    };

    this.set = function(selector, object) {
        var result = this.storage.set(selector, object);;
        this.emit("set", selector, result);
        return result;
    };

    this.save = function(selector, object) {
        return this.storage._save(selector, object);
    };

    return result;
};

Inherit(StorageService, Service, {

});

module.exports = StorageService;

