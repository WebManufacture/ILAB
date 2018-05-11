useModule("utils.js");
var EventEmitter = useSystem('events');
var Service = useRoot("/System/Service.js");
var ServiceProxy = useRoot("/System/ServiceProxy.js");

function AutoSyncService(params){
    var self = this;
    if (params.source && params.destination) {
        Frame.log("AUTOSYNC FROM " + params.source + " TO " + params.destination);
        ServiceProxy.connect(params.source).then((fs) => {
            Frame.log("Listening " + params.source);
            self.sourceFs = fs;
            fs.on("creating-dir", (params)=>{
                self.createDir(self.destinationFs, params);
            });
            fs.on("writed", (params)=>{
                self.syncFile(self.destinationFs, self.sourceFs, params);
            });
            fs.on("deleting", (params)=>{
                self.deleteLink(self.destinationFs, params);
            });
        }).catch((err) => {

        });
        ServiceProxy.connect(params.destination).then((fs) => {
            Frame.log("Syncing to " + params.destination);
            self.destinationFs = fs;
        }).catch((err) => {

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
        srcFs.ReadStream(params, 'binary').then((stream)=>{
            return dstFs.WriteStream(params, 'binary').then((stream2)=>{
                stream.pipe(stream2);
            }).catch((err)=>{
                Frame.error(err);
            });
        }).catch((err)=>{
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
