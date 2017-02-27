var Path = require('path');
var fs = require('fs');
var os = require("os");
useModule("utils.js");
var Service = useRoot("/System/Service.js");
var SerialPort = require('serialport');

Frame.serviceId = "SerialService";
/*Events
 virtual-start
 virtual-stop
 virtual-exited
 virtual-cmd
 virtual-error
 virtual-output
 */
function SerialService(params){
    var self = this;
    this.ListPorts = function () {
        return new Promise(function(resolve, reject){
            SerialPort.list(function (err, list) {
                if (err) reject(err);
                else resolve(list)
            });
        });
    };
    return Service.call(this, params);
}

SerialService.serviceId = "SerialService";

Inherit(SerialService, Service, {
    openPort : function (portName) {
        var port = new SerialPort('/dev/tty-usbserial1', function (err) {
            if (err) {
                return console.log('Error: ', err.message);
            }
            port.write('main screen turn on', function(err) {
                if (err) {
                    return console.log('Error on write: ', err.message);
                }
                console.log('message written');
            });
        });
    },
    error : function (err) {
        this.emit("serial-error", err);
    }
});

module.exports = SerialService;
