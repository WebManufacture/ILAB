var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
var Service = useRoot("/System/Service.js");
useModule("utils.js");

function FilesService(config){
    var self = this;
    this.basePath = config.basepath ? config.basepath : "./";
    this.aliases = config.aliases ? config.aliases : {};

	this.Browse = function(path) {
		const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            fs.readdir(fpath, function(err, files){
                if (err){
					reject("readdir " + fpath + " error " + err);
					return;
                }
                for (var i = 0; i < files.length; i++){
                    var fname = files[i];
                    files[i] = fs.statSync(fpath + "\\" + fname);
                    files[i].name = fname;
                    files[i].fileType = files[i].isDirectory() ? "directory" : files[i].isFile() ? "file" : "unknown";
                }
                resolve(JSON.stringify(files));
            });
        });
    };

	this.Delete = function (path) {
		const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
			self.emit("deleting", path);
			fs.unlink(fpath, function (err, result) {
				if (err) {
					reject("Delete error " + path + " " + err);
					return;
				}
				self.emit("deleted", path);
				resolve(path, stats);
			});
        });
    };

    this.Write = function (path, content) {
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            this.emit("writing", path);
            fs.writeFile(fpath, content, function(err, result){
                if (err){
                    reject("File " + path + " write error " + err);
                    return;
                }
                resolve(path);
            });
        });
    };

    this.Read = function(path){
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            fs.readFile(Path.resolve(fpath), 'utf8', function (err, result) {
                if (err) {
                    reject("File " + fpath + " read error " + err);
                    return;
                }
                if (result.length >= 1000000) {
                    reject("File " + fpath + " too big ");
                    return
                }
                resolve(result);
            });
        });
    };

    this.ReadStream = function(path, encoding){
        if (!encoding) encoding = 'binary';
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            fs.stat(fpath, function (err, stats) {
                if (err) {
                    reject("File " + fpath + " read error " + err);
                    return;
                }
                const stream = fs.createReadStream(fpath, encoding);
                stream.length = stats.size;
                resolve(stream);
            });
        });
    };

    this.WriteStream = function(path, encoding){
        if (!encoding) encoding = 'binary';
        const fpath = Path.resolve(self.preparePath(path));
        var socket = this;
        return fs.createWriteStream(fpath, socket, encoding);
    };

    return Service.call(this, config);
};

FilesService.serviceId = "FilesService";
	
Inherit(FilesService, Service, {
	preparePath : function(fpath){
	    if (!fpath) fpath = '';
		fpath = fpath.replace(/\//g, "\\");
		if (!fpath.start("\\")) fpath = "\\" + fpath;
		fpath = this.basePath + fpath;
		fpath = fpath.replace(/\//g, "\\");
		if (fpath.end("\\")) fpath = fpath.substr(0, fpath.length - 1);
		return fpath.toLowerCase();
	},
});

module.exports = FilesService;

