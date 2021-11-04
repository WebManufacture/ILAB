useModule("utils.js");
var EventEmitter = require('events');
var Service = useSystem("Service.js");
var ServiceProxy = useSystem("ServiceProxy.js");

function AutoSyncService(params){
    var self = this;
    var selfBlockSyncWrite = {};
    var selfBlockSyncDel = {};
    var selfBlockSyncCreate = {};
    if (params.source && params.destination) {
        Frame.log("AUTOSYNC FROM " + params.source + " TO " + params.destination);
        ServiceProxy.connect(params.source).then((fs) => {
            self.sourceFs = fs;
            Frame.log("Connected to " + params.source+ "/" + fs.serviceId);
            /*fs.Watch("").then((path) => {
                Frame.log("Wathing " + path);
            });
            fs.on("watch", (eventType, path, npath) => {
                Frame.log(eventType + " on " + path + " with " + npath);
            });*/
            Frame.log("Listening " + params.source);
            fs.on("creating-dir", (params) => {
                if (!selfBlockSyncCreate[params]) {
                    selfBlockSyncCreate[params] = new Date();
                    self.createDir(self.destinationFs, params);
                } else {
                    delete selfBlockSyncCreate[params];
                }
            });
            fs.on("writed", (params) => {
                if (!selfBlockSyncWrite[params]) {
                    selfBlockSyncWrite[params] = new Date();
                    self.syncFile(self.destinationFs, self.sourceFs, params);
                } else {
                    delete selfBlockSyncWrite[params];
                }
            });
            fs.on("deleting", (params) => {
                if (!selfBlockSyncDel[params]) {
                    selfBlockSyncDel[params] = new Date();
                    self.deleteLink(self.destinationFs, params);
                } else {
                    delete selfBlockSyncDel[params];
                }
            });
        }).catch((err) => {
            Frame.log("Can't connect " + params.source);
            Frame.error(err);
        });
        ServiceProxy.connect(params.destination).then((fs) => {
            self.destinationFs = fs;
            Frame.log("Connected to " + params.destination + "/" + fs.serviceId);
            if (params.mode == "bidirectional") {
                Frame.log("Bidirectional syncing to " + params.destination);
                fs.on("creating-dir", (params)=>{
                    if (!selfBlockSyncCreate[params]) {
                        selfBlockSyncCreate[params] = new Date();
                        self.createDir(self.sourceFs, params);
                    } else {
                        delete selfBlockSyncCreate[params];
                    }
                });
                fs.on("writed", (params)=>{
                    if (!selfBlockSyncWrite[params]) {
                        selfBlockSyncWrite[params] = new Date();
                        self.syncFile(self.sourceFs, self.destinationFs, params);
                    } else {
                        delete selfBlockSyncWrite[params]
                    }
                });
                fs.on("deleting", (params)=>{
                    if (!selfBlockSyncDel[params]) {
                        selfBlockSyncDel[params] = new Date();
                        self.deleteLink(self.sourceFs, params);
                    } else {
                        delete selfBlockSyncDel[params]
                    }
                });
            }
        }).catch((err) => {
            Frame.log("Can't connect " + params.destination);
            Frame.error(err);
        });
    }
    return Service.call(this, "AutoSyncService");
}

AutoSyncService.serviceId = "AutoSyncService";

Inherit(AutoSyncService, Service, {
    preparePath: function (path) {
        if (fpath.indexOf(":\\") < 0) {
            fpath = fpath.replace(/\\\\/g, "/");
            fpath = fpath.replace(/\\/g, "/");
            if (!fpath.start("/")) fpath = "/" + fpath;
            fpath = this.basePath + fpath;
        }
        if (fpath.end("/")) fpath = fpath.substr(0, fpath.length - 1);
    },

    //... тут какие-то внутренние методы сервиса
    createDir : function(localFs, params){
        Frame.log("creating " + params);
        localFs.CreateDir(params).then((result)=>{
            Frame.log("Creating Dir " + params + " > " + result);
        }).catch((err)=>{
            Frame.log("Creating Dir error " + params);
            Frame.error(err);
        });
    },

    syncFile : function(dstFs, srcFs, params){
        Frame.log("FileChanged " + params);
        return dstFs.WriteStream(params, 'binary').then((stream2) => {
            return srcFs.ReadStream(params, 'binary').then((stream) => {
                stream.pipe(stream2);
            }).catch((err) => {
                Frame.error(err);
            });
        }).catch((err) => {
            Frame.error(err);
        });
    },

    deleteLink : function(localFs, params){
        Frame.log("Deleting " + params);
        localFs.Delete(params).then(()=>{
            Frame.log("Deleted " + params);
        }).catch((err)=>{
            Frame.error(err);
        });
    }
});

module.exports = AutoSyncService;
