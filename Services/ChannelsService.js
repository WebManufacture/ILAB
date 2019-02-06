var fs = require('fs');
var JsonSocket = useModule('jsonsocket');
var net = require('net');
var Path = require('path');
var EventEmitter = require('events');
var util = useModule('utils');
const stream = require('stream');
var ServiceProxy = useRoot('System/ServiceProxy');

ChannelsService = function(params){
    var self = this;

    return Service.apply(this, arguments);
};

Inherit(ChannelsService, Service, {

});

module.exports = Service;