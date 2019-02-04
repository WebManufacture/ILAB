var fs = useSystem('fs');
var JsonSocket = useModule('jsonsocket');
var net = useSystem('net');
var Path = useSystem('path');
var EventEmitter = useSystem('events');
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