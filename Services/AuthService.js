var fs = require('fs');
var Async = useModule('async');
var Path = require('path');
var Url = require('url');
var http = require('http');
var https = require('https');
var stream = require('stream');
var EventEmitter = require('events');
var Service = useSystem("Service.js");
var ServiceProxy = useSystem("Service.js");


StorageService = function (params) {
    var result = Service.apply(this, arguments);

};

Inherit(StorageService, Service, {

});

module.exports = StorageService;