var Path = require('path');
var fs = require('fs');

Frame = {
    isChild : true;
};

Frame.basePath = process.argv[1];
Frame.baseDirectory = Path.dirname(Frame.basePath);

Frame._initFrame = function () {

    try {
        Frame.useModule("Utils.js");
        Frame.useModule("Async.js");

        process.setMaxListeners(100);

        var config = process.argv[2];

        try {
            config = JSON.parse(config);
            if (config.cwd) {
                process.chdir(config.cwd)
            }
        }
        catch (e) {
            config = {};
        }

            var unloadingTimeout = null;

            function UnloadBlocking(callback) {
                if (Frame.pinterval) {
                    clearInterval(Frame.pinterval);
                }
                if (!unloadingTimeout) {
                    console.log("EXIT INITIATED");
                }
                else {
                    clearTimeout(unloadingTimeout);
                }
            }

            process.on('SIGTERM', UnloadBlocking);
            process.on('exit', UnloadBlocking);
            if (Frame.isChild) {
                var Channels = useModule("Channels.js")();

                process.on("message", function (pmessage) {
                    if (pmessage == 'process.start') {
                        try {
                            Frame.RootNode.Start();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.stop') {
                        try {
                            Frame.RootNode.Stop();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.sleep') {
                        try {
                            Frame.RootNode.Sleep();
                        }
                        catch (error) {
                            process.send('error', error);
                        }
                    }
                    if (pmessage == 'process.unload') {
                        Frame.RootNode.Unload();
                        unloadingTimeout = setTimeout(function () {
                            logger.warn("CHILD PROCESS EXITED BY TIMEOUT 3s !");
                            unloading = true;
                            process.exit();
                        }, 3000);
                    }
                    if (typeof pmessage == "object") {
                        if (pmessage.type && pmessage.type == "channel.subscribe" && pmessage.pattern) {
                            if (pmessage.clientId) {
                                var client = Channels.followed[pmessage.clientId];
                                if (client) {
                                    if (client[pmessage.pattern]) {
                                        logger.warn("REFOLLOWING PATTERN DETECTED: " + pmessage.pattern);
                                        return;
                                    }
                                }
                                else {
                                    client = Channels.followed[pmessage.clientId] = {};
                                }
                                client[pmessage.pattern] = 1;
                            }
                            else {
                                //console.warn("Anonymous client DETECTED " + pmessage.pattern);
                            }
                            Channels.followToGlobal(pmessage.pattern);
                        }
                        if (pmessage.type && pmessage.type == "channel.message") {
                            var dateEnd = new Date();
                            var dateStart = new Date(pmessage.date);
                            //console.log("-> " + pmessage.args[0]);
                            Channels.emit.apply(Channels, pmessage.args);
                        }
                    }
                });

                Channels.emitToGlobal = function (path, message, source) {
                    process.send({type: path, args: message, source: source});
                };

                Channels.subscribeToGlobal = function (pattern) {
                    process.on("message", function (pmessage) {
                        if (typeof pmessage == "object" && pmessage.type && pmessage.type == "channelMessage" && pmessage.args) {
                            Channels.emit.apply(Channels, pmessage.args);
                        }
                    });
                    Channels.emitToGlobal("channel.subscribe", pattern);
                };

                Channels.followed = {};

                function follower(message) {
                    Channels.emitToGlobal("channel.follow", arguments);
                };

                Channels.followToGlobal = function (pattern) {
                    //console.log("--> Following " + pattern);
                    Channels.on(pattern, follower);
                };

                if (Frame.isChild) {
                    var subscribers = process.argv[3];
                    if (subscribers) subscribers = JSON.parse(subscribers);
                }

                for (var pattern in subscribers) {
                    Channels.followToGlobal(pattern);
                }

                Frame.RootNode.on("state", function (state) {
                    Channels.emitToGlobal("process.state", arguments);
                    //Channels.emitToGlobal("process." + Node.Statuses[state], arguments);
                });
            }