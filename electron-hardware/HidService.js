var Service = useSystem("Service.js");
var fs = require('fs');
useModule("utils.js");
var HID = require('node-hid');

const defaultReadInterval = 3000;

function HidService(params) {
    var self = this;
    const usefulSize = 62;

    this.monitoringInterval = null;

    this.VID = params && params.vendorId ? params.vendorId : 0;
    this.PID = params && params.productId ? params.productId : 0;
    //var logFile = fs.createWriteStream("Write.log");

    var startLogging = ()=>{
        //logFile.cork();
    }

    function finishLogging(){
        /*if (logFile){
         logFile.uncork();
        }*/
    }

    function logData(arr){
        /* var str = "";
         if (arr){
         for (var i = 0; i< arr.length; i++){
         if (typeof arr[i] != 'number') {
         str += "," + arr[i];
         console.error("Incorrect arr", arr);
         } else {
         str += ",0x" + (arr[i] < 16 ? "0" : "") + (arr[i].toString(16));
         }
         }
         logFile.write(str.substring(1) + "\n");
         }*/
    }

    this.StartMonitoringDevice = () => {
        if (!this.monitoringInterval) {
            console.log("Monitoring device started!");
            this.monitoringInterval = setInterval(() => {
                this.checkDevice()
            }, 1000);
        }
        return this.checkDevice();
    };

    this.StopMonitoringDevice = function (name) {
        if (self.monitoringInterval) {
            clearInterval(self.monitoringInterval);
            self.monitoringInterval = null;
        }
    };

    this.GetDevicesList = function () {
        return this.getDevicesList();
    };

    this.WriteDeviceReport = (report) => {
        var bytesWritten = 0;
        return this.deviceWaitingPromise(null, (device,resolve, reject) => {
            try{
                startLogging();
                device.write(Buffer.from(report));
                logData(report);
                finishLogging();
            } catch (err){
                this.unlockDevice(device);
                reject(err);
                return;
            }
            device.removeAllListeners();
            this.unlockDevice(device);
            resolve(bytesWritten);
        });
    };

    this.WriteDeviceReports = (reportsToWrite) => {
        var bytesWritten = 0;
        return this.deviceWaitingPromise(null, (device,resolve, reject) => {
            try{
                startLogging();
                for (var i = 0; i < reportsToWrite.length; i++) {
                    //console.log(device.getDeviceInfo());
                    bytesWritten += device.write(Buffer.from(reportsToWrite[i]));
                    logData(reportsToWrite[i]);
                    //console.log('tx bytes ',bytesWritten )
                    // device.on("data", function (data) {
                    //   console.log(data);
                    // });
                    this.emit("report-sent", {
                        index: i+1,
                        count: reportsToWrite.length
                    });

                }
                finishLogging();
            } catch (err){
                this.unlockDevice(device);
                reject(err);
                return;
            }
            device.removeAllListeners();
            this.unlockDevice(device);
            resolve(bytesWritten);
        });
    };

    this.WriteDeviceReportsWithWaiting = (reportsToWrite, waitCondition) => {
        //console.log('rep, cond : ',reportsToWrite, waitCondition);
        var bytesWritten = 0;
        var writenReports = [];
        var waitingResult = null;
        return this.deviceWaitingPromise(5000, (device,resolve, reject) => {

            try{
                //startLogging();
                for (var i = 0; i < reportsToWrite.length ; i++) {

                    writenReports.push(Buffer.from(reportsToWrite[i]));
                    device.on("data", function (data) {
                        console.log('WithWaiting data', data[1]);
                    });
                    bytesWritten += device.write(Buffer.from(reportsToWrite[i]));
                    //console.log("reports:", reportsToWrite.length);

                    //logData(reportsToWrite[i]);
                    this.emit("report-sent", {
                        index: i,
                        count: reportsToWrite.length
                    });
                    //console.log('written report #: ', i);
                }
                //finishLogging();
                var data = null;
                while(!data) {
                    data = device.readTimeout(5000);

                    if (data[1] == waitCondition) {
                        waitingResult = data;
                        break;
                    }
                    // if (data[2] == waitCondition) {
                    //     waitingResult = data;
                    //     break;
                    // }
                    data = null;
                }
            } catch (err){
                this.unlockDevice(device);
                reject(err);
                return;
            }
            this.unlockDevice(device);
            resolve(waitingResult);
        });
    };

    this.ReadDeviceReport = () => {
        return this.WriteAndReadDeviceReports(null);
    };

    this.WaitDeviceReport = (reportStart) => {
        return this.deviceWaitingPromise(null, (device,resolve, reject) => {
            var data = null;
            try{
                while(!data) {
                    data = device.readTimeout(1000);
                    //console.log("DSer DATA : ", data, device);
                    if (data[1] == reportStart) {
                        break;
                    }
                    data = null;
                }
            } catch (err){
                this.unlockDevice(device);
                reject(err);
                return;
            }
            this.unlockDevice(device);
            resolve(data);
        });
    };

    this.WriteAndReadDeviceReports = (reportsToWrite, waitInterval) => {
        return this.deviceWaitingPromise(waitInterval, (device,resolve, reject) => {
            var resultsBuffers = [];
            var currentReportIndex = 0;
            for (var i = 0; i < reportsToWrite.length; i++) {
                try {
                    startLogging();
                    device.write(Buffer.from(reportsToWrite[i]));
                    logData(reportsToWrite[i]);
                    finishLogging();
                    var data = device.readTimeout(3000);
                } catch (err){
                    this.unlockDevice(device);
                    reject(err);
                    return;
                }
                resultsBuffers.push(data);
                this.emit("report-readed", {
                    index: currentReportIndex,
                    count: reportsToWrite.length
                });
                currentReportIndex++;
            }
            self.unlockDevice(device);
            resolve(resultsBuffers);
        });
    };

    return Service.apply(this, arguments);
}


Inherit(HidService, Service, {
    isDeviceConnected(){
        return this.deviceInfo != null;
    },

    getDevicesList() {
        var currentDevicesInfo = HID.devices(); //all HID devices
        var foundDevices = [];
        for (let device of currentDevicesInfo) {
            //ANALIZE DEVICES TO VID PID
            if ((this.VID == 0 || device.vendorId == this.VID) && (this.PID == 0 || device.productId == this.PID)) {
                foundDevices.push(device);
            }
        }
        //console.log("found devices : ", foundDevices);
        return foundDevices;
    },

    checkDevice() {
        if (this.deviceLocked) {
            console.log("Checking device locked!");
            return this.deviceInfo;
        }
        try {
            var devices = this.getDevicesList();
            if (devices[0]) {
                if (!this.deviceInfo) {
                    console.log("Device connected");
                    this.deviceInfo = devices[0];
                    this.deviceConnected(devices[0]);
                }
            } else {
                if (this.deviceInfo) {
                    console.log("Device disconnected");
                    this.deviceInfo = null;
                    this.deviceDisconnected(this.deviceInfo);
                }
            }
        } catch (err) {
            console.error(err);
        }
        return this.deviceInfo;
    },

    deviceConnected: function (device) {
        this.emit("device-status", "online");
        this.emit("connected");
    },

    deviceDisconnected: function (device) {
        this.unlockDevice();
        try {
            if(this.device){
                this.device.removeAllListeners('data');
                this.device.removeAllListeners('report-sent');
                console.log('data listeners cleared');
                this.device.close();
            }
        } catch (err){
            console.error(err);
        }
        this.device = null;
        this.emit("device-status", "offline");
        this.emit("disconnected");

    },

    lockDevice() {
        if (!this.isDeviceConnected()) {
            console.log("Device not connected");
            return null;
        }
        if (this.deviceLocked) {
            console.log("Device locked: ", this.deviceLocked);
            return null;
        }
        this.deviceLocked = true;
        if (!this.device){
            console.log("INFO", this.deviceInfo);
            this.device = new HID.HID(this.deviceInfo.vendorId, this.deviceInfo.productId);
            //this.device.setNonBlocking(false);
        }
        return this.device;
    },

    unlockDevice(device) {
        if (device) {
            device.removeAllListeners();
        }
        this.deviceLocked = false;
    },


    deviceWaitingPromise(waitInterval, callback){
        return new Promise((resolve, reject) => {
            var waitTimeout;
            waitInterval = waitInterval ? waitInterval : defaultReadInterval;
            var handler = () => {
                if (!this.isDeviceConnected()) {
                    console.log("deviceWaitingPromise: not connect", this.deviceInfo);
                    reject("Device not connected");
                    return;
                }
                var device = this.lockDevice();
                if (!device) {
                    if (waitInterval <= 0) {
                        clearTimeout(waitTimeout);
                        waitTimeout = null;

                        reject("Reading timeout expired, device connection status:" + this.isDeviceConnected());
                    } else {
                        console.log("deviceWaitingPromise, wait interval : ", waitInterval);
                        waitInterval -= 100;
                        waitTimeout = setTimeout(handler, 100);
                    }
                } else {
                    var self = this;
                    try {
                        device.on("error", function (error) {
                            device.removeAllListeners();
                            console.error(error);
                            self.unlockDevice(device);
                            reject(error);
                        });
                        try {
                            callback(device, resolve, reject);
                        } catch (err){
                            console.log(typeof callback);
                            console.error(err);
                            reject(err);
                        }
                    } catch (err) {
                        device.removeAllListeners();
                        self.unlockDevice(device);
                        console.error(err);
                        reject(err);
                    }
                }
            };
            handler();
        });
    }
});

module.exports = HidService;
