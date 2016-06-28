var Path = require('path');
var fs = require('fs');
var EventEmitter = require('events');
var util = require('util');
var os = require("os");
var Supervisor = require(Path.resolve("monitors.js")).SpawnMonitor;

Frame = { isChild : false };

Frame.basePath = Path.dirname(process.argv[1]);
Frame.workingPath = typeof(process.argv[2]) == 'string' ? Path.resolve(process.argv[2]) : process.cwd()
Frame.SocketPort = 4994;
Frame.forkPort = 4995;

Frame._initFrame = function () {

    try {
        process.setMaxListeners(100);

        var wd = process.argv[2];
        
        var supervisor = new Supervisor({
            port: Frame.SocketPort,
            workPath : Frame.workingPath,
            saveHistory : true
        });
        supervisor.start();
        /*setInterval(function() {
            console.log(new Date());
        }, 5000);*/
    }
    catch (err) {
        console.error(err.stack);
    }
}

Frame._initFrame();