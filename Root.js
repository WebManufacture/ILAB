var Path = require('path');
require('./Modules/utils.js');

function _parseCmd () {
    var debugMode = false;
    var mainContainer = {
        type: "Container",
        id: createUUID(),
        nodes: [],
        terminals: [],
        containers: [],
        modules: []
    };

    function parseConfig(config){
        if (!config) return null;
        if (!config.type){
            config.type = "node";
        }
        if (config.id) {
            if (config.id == "auto") {
                config.id = createUUID();
            }
        } else {
            config.id = config.type;
        }
        if (!config.path){
            config.path = config.type;
        }
        if (config.path.indexOf(".js") < 0) {
            config.path += ".js";
        }
        return config;
    }

    try{
        if (process.execArgv[0] && (process.execArgv[0].indexOf("--inspect") >= 0 || process.execArgv[0].indexOf("--debug") >= 0)){
            debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
        }

        //Looking for the keys
        for (var i = 2; i <= process.argv.length; i++) {
            var arg = process.argv[i];
            if (!arg) continue;

            if (arg === "--basic") {
                mainContainer.nodes.push(parseConfig({
                    type: "PipeTerminal",
                    id: "auto"
                }));
                mainContainer.nodes.push(parseConfig({
                    type: "NetTerminal",
                    id: "auto"
                }));
                mainContainer.nodes.push(parseConfig({
                    type: "UdpTerminal",
                    id: "auto"
                }));
                mainContainer.nodes.push(parseConfig({
                    type: "HttpTerminal",
                    id: "auto"
                }));
                mainContainer.nodes.push(parseConfig({
                    type: "WsTerminal",
                    id: "auto"
                }));
                mainContainer.nodes.push(parseConfig({
                    type: "DiscoveryService",
                    id: "auto"
                }));
                continue;
            }
            if (arg === "--demo" || arg.indexOf("--config") === 0) {
                // используется config.json если аргументом идёт флаг --config
                var configFileName = arg === "--demo" ? "config-sample.json": "config.json";

                if (arg.indexOf("=") > 0) {
                    configFileName = arg.split("=")[1];
                }
                try{
                    if (configFileName.indexOf(".hs") == configFileName.length - 4){
                        //Transplit HyperScript config there
                    } else {
                        var configFile = require(Path.resolve(configFileName));
                    }
                    if (Array.isArray(configFile)){
                        //Array style == running inside services;
                        configFile.forEach((config)=>{
                            mainContainer.nodes.push(parseConfig(config));
                        });
                    } else {
                        if (typeof configFile == "object") {
                            for (var key in configFile) {
                                mainContainer[key] = configFile[key];
                            }
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        }

        //Looking for config overrides
        for (var i = 2; i <= process.argv.length; i++) {
            var arg = process.argv[i];
            if (!arg) continue;
            if (arg.indexOf("--inspect") >= 0) {
                debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                continue;
            }
            if (arg === "--old") {
                mainContainer.useOldStart = true;
                continue;
            }
            if (arg === "--pipe") {
                mainContainer.terminals.push(parseConfig({
                    type: "PipeTerminal",
                    port: arg.split("=")[1],
                    id: "auto"
                }));
                continue;
            }
            if (arg === "--tcp") {
                mainContainer.terminals.push(parseConfig({
                    type: "NetTerminal",
                    port: arg.split("=")[1],
                    id: "auto"
                }));
                continue;
            }
            if (arg === "--udp") {
                mainContainer.terminals.push(parseConfig({
                    type: "UdpTerminal",
                    port: arg.split("=")[1],
                    id: "auto"
                }));
                continue;
            }
            if (arg === "--http") {
                mainContainer.terminals.push(parseConfig({
                    type: "HttpTerminal",
                    port: arg.split("=")[1],
                    id: "auto"
                }));
                continue;
            }
            if (arg === "--ws") {
                mainContainer.terminals.push(parseConfig({
                    type: "WsTerminal",
                    port: arg.split("=")[1],
                    id: "auto"
                }));
                continue;
            }
            if (arg.indexOf("{") == 0) {
                try {
                    var overrides = eval("(function(){ return " + arg + "; })()");
                    for (var key in overrides) {
                        mainContainer[key] = configFile[key];
                    }
                } catch (err) {
                    console.error(err);
                }
                continue;
            }
            if (arg.indexOf("Node") >= 0){
                mainContainer.nodes.push(parseConfig({
                    path: arg
                }));
                continue;
            }
            if (arg.indexOf("Service") >= 0){
                mainContainer.services.push(parseConfig({
                    path: arg
                }));
                continue;
            }
            if (arg.indexOf("Terminal") >= 0){
                mainContainer.terminals.push(parseConfig({
                    path: arg
                }));
                continue;
            }
            mainContainer.modules.push(parseConfig({
                path: arg
            }));
        }
        process.debugMode = typeof v8debug === 'object' || debugMode;
        return mainContainer;
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
        return mainContainer;
    }
};

var nodesToStart = _parseCmd();
if (!nodesToStart.type) nodesToStart.type = "Container";
var debugMode =  process.debugMode;
console.log(`Starting ${nodesToStart.type} container.`);
(() => {
    const object = require(`./System/${nodesToStart.type}.js`);
    if (object) {
        if (object.prototype) {
            new object(nodesToStart);
        } else {
            object(nodesToStart);
        }
    }
})();