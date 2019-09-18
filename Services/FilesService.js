var http = require('http');
var Url = require('url');
var fs = require('fs');
var Path = require('path');
var Service = useSystem("Service.js");
useModule("utils.js");

function FilesService(config){
    var self = this;
    this.basePath = config.basepath ? config.basepath : "./";
    this.aliases = config.aliases ? config.aliases : {};
    this.watchingPath = {};

    this.Stats = function(path) {
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                fs.stat(fpath, function (err, stat) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stat.isDirectory = stat.isDirectory();
                    stat.isFile = stat.isFile();
                    resolve(stat);
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

	this.Browse = function(path) {
		const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                fs.readdir(fpath, function(err, files){
                    if (err){
                        reject("readdir " + fpath + " error " + err);
                        return;
                    }
                    for (var i = 0; i < files.length; i++){
                        var fname = files[i];
                        files[i] = fs.statSync(fpath + "/" + fname);
                        files[i].name = fname;
                        files[i].fileType = files[i].isDirectory() ? "directory" : files[i].isFile() ? "file" : "unknown";
                    }
                    resolve(files);
                });
            }
            catch (err){
                reject(err);
            }	
        });
    };

    this.Move = function(path1, path2) {
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                fs.stat(fpath, function (err, stat) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stat.isDirectory = stat.isDirectory();
                    stat.isFile = stat.isFile();
                    resolve(stat);
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

    this.Copy = function(path1, path2) {
        const fpath1 = Path.resolve(self.preparePath(path1));
        const fpath2 = Path.resolve(self.preparePath(path2));

        return new Promise(function (resolve, reject) {
            try {
                fs.copyFile(fpath1, fpath2, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve([fpath1, fpath2]);
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

    this.Move = function(path1, path2) {
        const fpath1 = Path.resolve(self.preparePath(path1));
        const fpath2 = Path.resolve(self.preparePath(path2));

        return new Promise(function (resolve, reject) {
            try {
                fs.copyFile(fpath1, fpath2, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    fs.stat(fpath2, function (err, stat) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (stat.isDirectory()) {
                            fs.rmdir(fpath1, function (err, result) {
                                if (err) {
                                    reject("Delete error " + path + " " + err);
                                    return;
                                }
                                self.emit("deleted", path);
                                resolve(path2, result);
                            });
                        }
                        else {
                            fs.unlink(fpath1, function (err, result) {
                                if (err) {
                                    reject("Delete error " + path + " " + err);
                                    return;
                                }
                                self.emit("deleted", path);
                                resolve(path2, result);
                            });
                        }
                    });
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

	this.Delete = function (path) {
		const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try{
                self.emit("deleting", self.formatPath(path));
                fs.stat(fpath, function (err, stat) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (stat.isDirectory()) {
                        fs.rmdir(fpath, function (err, result) {
                            if (err) {
                                reject("Delete error " + path + " " + err);
                                return;
                            }
                            self.emit("deleted", path);
                            resolve(path, result);
                        });
                    }
                    else {
                        fs.unlink(fpath, function (err, result) {
                            if (err) {
                                reject("Delete error " + path + " " + err);
                                return;
                            }
                            self.emit("deleted", path);
                            resolve(path, result);
                        });
                    }
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

    this.Write = function (path, content) {
        var self = this;
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                self.emit("writing", self.formatPath(path));
                fs.writeFile(fpath, content, function (err, result) {
                    if (err) {
                        reject("File " + path + " write error " + err);
                        return;
                    }
                    self.emit("writed", path);
                    resolve(path);
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

    this.Read = function(path){
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try{
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
            }
            catch (err){
                reject(err);
            }
        });
    };

    this.ReadStream = function(path, encoding){
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                fs.stat(fpath, function (err, stats) {
                    if (err) {
                        reject("File " + fpath + " read error " + err);
                        return;
                    }
                    const stream = encoding ?  fs.createReadStream(fpath, encoding): fs.createReadStream(fpath);
                    stream.length = stats.size;
                    stream.encoding = encoding;
                    resolve(stream);
                });
            }
            catch (err){
                reject("File " + fpath + " read error " + err);
            }
        });
    };

    this.WriteStream = function(path, encoding){
        self.emit("writing", this.formatPath(path));
        const fpath = Path.resolve(self.preparePath(path));
        var socket = this;
        var stream = encoding ? fs.createWriteStream(fpath, socket, encoding) :  fs.createWriteStream(fpath, socket);
        stream.once("finish", ()=> {
            self.emit("writed", this.formatPath(path));
        });
        return stream;
    };

    this.Watch = function(path, recursive){
        const fpath = Path.resolve(self.preparePath(path));
        if (!self.watchingPath[fpath]){
            return new Promise(function (resolve, reject) {
                    self.watchingPath[fpath] = true;
                    fs.stat(fpath, function (err, stat) {
                        if (err) {
                            reject("File " + fpath + " watch error " + err);
                            return;
                        }
                        try {
                            fs.watch(fpath, {recursive: recursive}, function (eventType, npath) {
                                self.emit("watch:" + path, eventType, npath);
                                self.emit("watch-" + eventType, fpath + "\\" + npath, npath);
                                self.emit("watch", eventType, fpath + "\\" + npath, npath);
                            });
                            resolve(fpath);
                        }
                        catch (err) {
                            reject("File " + fpath + " watch error " + err);
                        }
                    });
            });
        }
        return fpath;
    };

    this.CreateDir = function (path) {
        var self = this;
        const fpath = Path.resolve(self.preparePath(path));
        return new Promise(function (resolve, reject) {
            try {
                self.emit("creating-dir", self.formatPath(path));
                fs.mkdir(fpath, function (err, result) {
                    if (err) {
                        reject("Dir " + path + " create error " + err);
                        return;
                    }
                    self.emit("created-dir", path);
                    resolve(path);
                });
            }
            catch (err){
                reject(err);
            }
        });
    };

    return Service.call(this, config);
};

Inherit(FilesService, Service, {
    formatPath : function(fpath){
        if (!fpath) fpath = '';
        if (fpath.indexOf(":\\") < 0) {
            fpath = fpath.replace(/\\\\/g, "/");
            fpath = fpath.replace(/\\/g, "/");
            if (fpath.indexOf("/") != 0) fpath = "/" + fpath;
            fpath = fpath.replace(/\/\//g, "/");
        }
        if (fpath.end("/")) fpath = fpath.substr(0, fpath.length - 1);
        return fpath;
    },

	preparePath : function(fpath){
	    if (!fpath) fpath = '';
        if (fpath.indexOf(":\\") < 0) {
	    	fpath = fpath.replace(/\\\\/g, "/");
            fpath = fpath.replace(/\\/g, "/");
    		if (fpath.indexOf("/") != 0) fpath = "/" + fpath;
            fpath = this.basePath + fpath;
            fpath = fpath.replace(/\/\//g, "/");
        }
		if (fpath.end("/")) fpath = fpath.substr(0, fpath.length - 1);
		return fpath;
	},
});

module.exports = FilesService;

