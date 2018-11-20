var Path = require('path');
var fs = require('fs');
var os = require("os");
useModule("utils.js");
var Service = useRoot("/System/Service.js");
var usbDetect = require('usb-detection');


function UsbService(params){
    var self = this;

    usbDetect.startMonitoring();

    this.register("insert", {
        args:[
            {
                type: "object",
                title: "Device description"
            }
        ]
    });

    this.register("remove", {
        args:[
            {
                type: "object",
                title: "Device description"
            }
        ]
    });

    self.once("exiting", function () {
       usbDetect.stopMonitoring();
    });

    usbDetect.on('add', function(device) {
        self.emit("insert", device);
    });

    usbDetect.on('add', function(device) {
        self.emit("insert", device);
    });

    usbDetect.on('remove', function(device) {
        self.emit("remove", device);
    });


    this.Find = function(){
        return usbDetect.find();
    };
    return Service.call(this, params);
}

Inherit(UsbService, Service, {

});

module.exports = UsbService;
