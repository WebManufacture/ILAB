var Path = require('path');
var fs = require('fs');
var os = require("os");
useModule("utils.js");
var Service = useRoot("/System/Service.js");
var SerialPort = require('serialport');

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
    this.ports = {};
    this.ListPorts = function () {
        return new Promise(function(resolve, reject){
            SerialPort.list(function (err, list) {
                if (err) reject(err);
                else resolve(list)
            });
        });
    };
    this.once("exiting", () => {
        for (var port in self.ports){
            self.ports[portName].close();
        }
    })
    this.Identify = function(vid, pid){
        return new Promise(function(resolve, reject){
            reject("Function not present")
        });
    };
    this.OpenPort = function(portName, options){
        return new Promise(function(resolve, reject){
            if (self.ports[portName]) {
                resolve(portName);
                return true;
            }
            console.log("Serial port connecting " + portName);
            if (typeof options != "object") options = {};
            options.autoOpen = false;
            var port = new SerialPort(portName, options);
            port.on("error", function (err) {
                self.emit("serial-error", portName, err.message);
                self.emit("serial-error-" + portName, err.message);
            });
            port.on("open", function () {
                self.emit("serial-opened", portName);
                self.emit("serial-opened-" + portName);
            });
            port.on("data", function (data) {
                self.emit("serial-string", portName, data.toString("ascii"));
                self.emit("serial-string-" + portName, data.toString("ascii"));
                data = Array.from(data);
                self.emit("serial-data", portName, data);
                self.emit("serial-data-" + portName, data);
            });
            port.on("disconnect", function (err) {
                self.ports[portName] = null;
                self.emit("serial-disconnected", portName, err);
                self.emit("serial-disconnected-" + portName, err);
            });
            port.on("close", function (err) {
                self.ports[portName] = null;
                self.emit("serial-closed", portName, err);
                self.emit("serial-closed-" + portName, err);
            });
            port.open(function (err) {
                if (err) {
                    console.error('Serial ' + portName + ' open Error: ', err.message);
                    reject(err);
                    return false;
                }

                console.log("Serial opened: " + portName);
                self.ports[portName] = port;
                resolve(portName);
            });
        });
    };
    this.OpenStream = function(portName, options){
        return new Promise(function(resolve, reject){
            if (self.ports[portName]) {
                resolve(portName);
                return true;
            }
            console.log("Serial port connecting " + portName);
            if (typeof options != "object") options = {};
            options.autoOpen = false;
            var port = new SerialPort(portName, options);
            port.on("error", function (err) {
                self.emit("serial-error", portName, err.message);
                self.emit("serial-error-" + portName, err.message);
            });
            port.on("open", function () {
                self.emit("serial-opened", portName);
                self.emit("serial-opened-" + portName);
            });
            port.on("disconnect", function (err) {
                self.ports[portName] = null;
                self.emit("serial-disconnected", portName, err);
                self.emit("serial-disconnected-" + portName, err);
            });
            port.on("close", function (err) {
                self.ports[portName] = null;
                self.emit("serial-closed", portName, err);
                self.emit("serial-closed-" + portName, err);
            });
            port.open(function (err) {
                if (err) {
                    console.error('Serial ' + portName + ' open Error: ', err.message);
                    reject(err);
                    return false;
                }
                console.log("Serial opened in stream mode: " + portName);
                self.ports[portName] = port;
                resolve(port);
            });
        });
    };
    this.Send = function(portName, v, encoding){
        //'utf8', 'ascii', 'base64', 'binary', 'hex'
        var value = self.convert(v);
        console.log(value)
        var port = self.ports[portName];
        if (!port) {
            self.error(portName + " not opened");
            console.log(portName + " not opened");
            return false;
        }
        return new Promise(function(resolve, reject) {
            port.write(value, function (err) {
                if (err) {
                    console.log('cannot write', err);
                    reject(err);
                    return false;
                }
                else{
                    resolve(true);
                    return true;
                }
            });
        });
    };
    this.Write = function(portName, value){
        var port = self.ports[portName];
        if (!port) {
            self.error(portName + " not opened");
            return false;
        }
        return new Promise(function(resolve, reject) {
            port.write(Buffer.from(value), function (err) {
                if (err) {
                    reject(err);
                    return false;
                }
                else{
                    resolve(true);
                    return true;
                }
            });
        });
    };
    this.ClosePort = function(portName, options){
        return new Promise(function(resolve, reject) {
            if (!self.ports[portName]) reject(false);
            else {
                self.ports[portName].close(function (err) {
                    if (err){
                        console.log("Serial close error: " + err);
                        reject(err);
                    }
                    else {
                        console.log("Serial closed: " + portName);
                        resolve(true);
                    }
                });
            }
        });
    };
    return Service.call(this, params);
}

Inherit(SerialService, Service, {
    write : function (portName, data) {
        port.write('main screen turn on', function(err) {
            if (err) {
                return console.log('Error on write: ', err.message);
            }
            console.log('message written');
        });
    },

    error : function (err) {
        this.emit("serial-error", err);
    },

    convert : function (str) {
        var result = [];
        for (var i = 0; i < str.length; i++){
            result.push(str.charCodeAt(i));
        };
        return result;
    }
});

module.exports = SerialService;
