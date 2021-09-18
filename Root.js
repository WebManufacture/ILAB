var Path = require('path');
require(Path.resolve('./Utils/RequireExtention.js'));
useRoot('/Utils/utils.js');
var Container = useRoot('/System/Container.js');

(()=>{
    let modulesToStart = [];

    const mainContainer = new Container({
        tags: ["root"],
        handler : () => {}, //Default handler
        storage: [] //Default storage for sub containers and other
    });


    const ilabVersion = "4.1.0";
    console.log(`ILab ${ilabVersion} initializing`);

    function parseConfig(config){
        if (!config) return null;
        if (!config.path){
            config.path = Path.resolve(`./StandartModules/${config.type}`);
        }
        if (config.path.indexOf(".js") < 0) {
            config.path += ".js";
        }
        return config;
    }

    const basicTerminals = {
        "pipe" : parseConfig({
            type: "PipeTerminal",
            port: '/tmp-ilab-4-' + mainContainer.id,
        }),
        "tcp" : parseConfig({
            type: "TcpTerminal",
            port: 5000,
        }),
        "udp" : parseConfig({
            type: "UdpTerminal",
            port: 31337,
        }),
        "http" : parseConfig({
            type: "HttpTerminal",
            port: 80,

        }),
        "ws" : parseConfig({
            type: "WsTerminal",
            port: 5700,
        }),
        "discovery" : parseConfig({
            type: "DiscoveryModule",
        })
    }

    function addBasicModule(key, port){
        if (basicTerminals[key]) {
            const module = {
                ...basicTerminals[key]
            }

            if (!module.type) module.type = key;
            if (port) module.port = port;
            modulesToStart.push(module);
        }
    }

    function parseCmd () {
        var debugMode = false;
        let additionalConfig = {};
        try{
            if (process.execArgv[0] && (process.execArgv[0].indexOf("--inspect") >= 0 || process.execArgv[0].indexOf("--debug") >= 0)){
                debugMode = process.execArgv[0].indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
            }
            //Looking for the keys
            for (var i = 2; i <= process.argv.length; i++) {
                var arg = process.argv[i];
                if (!arg) continue;

                if (arg === "--demo" || arg.indexOf("--config") === 0) {
                    // используется config.json если аргументом идёт флаг --config
                    var configFileName = arg === "--demo" ? "config-sample.json" : "config.json";
                    console.log("Using config " + configFileName);
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
                            modulesToStart = [
                                ...modulesToStart,
                                ...configFile
                            ]
                        } else {
                            if (typeof configFile == "object") {
                                if (configFile.modules){
                                    for (var key in configFile.modules){
                                      modulesToStart.push({
                                        type: key,
                                        ...configFile.modules[key]
                                      })
                                    }
                                    delete configFile.modules;
                                }
                                additionalConfig = {
                                    ...additionalConfig,
                                    ...configFile
                                }
                            }
                        }
                    } catch (error) {
                        console.error(error);
                    }
                    continue;
                }
                if (arg.indexOf("--inspect") >= 0) {
                    debugMode = arg.indexOf("--inspect-brk") >= 0 ? "debug" : "inspect";
                    continue;
                }
                if (arg === "--old") {
                    additionalConfig.useOldStart = true;
                    continue;
                }
                if (arg === "--basic") {
                    for (const key in basicTerminals){
                        addBasicModule(key);
                    }
                    continue;
                }
                if (arg.indexOf("--pipe") === 0) {
                    addBasicModule('pipe', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg === "--tcp") {
                    addBasicModule('tcp', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg === "--udp") {
                    addBasicModule('udp', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg === "--http") {
                    addBasicModule('http', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg === "--ws") {
                    addBasicModule('ws', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg === "--discovery") {
                    addBasicModule('discovery', (arg.indexOf("=") > 0) ? arg.split("=")[1] : undefined );
                    continue;
                }
                if (arg.indexOf("{") == 0) {
                    try {
                        var overrides = eval("(function(){ return " + arg + "; })()");
                        for (var key in overrides) {
                            additionalConfig[key] = overrides[key];
                        }
                    } catch (err) {
                        console.error(err);
                    }
                    continue;
                }
                modulesToStart.push(parseConfig({
                    path: arg
                }));
            }

            process.debugMode = typeof v8debug === 'object' || debugMode;
            return additionalConfig;
        }
        catch (err) {
            console.log("Root ParseCMD Error: ");
            console.error(err);
            return additionalConfig;
        }
    };

    var config = parseCmd();

    async function __startRoot() {
        console.log(`Starting ${mainContainer.selector} modules`);
        await mainContainer.init(config);
        console.log(`Initializing ${modulesToStart.length} modules`);
        for (var module of modulesToStart) {
            await mainContainer.initModule(parseConfig(module));
        }
        console.log(`Loading modules`);
        await mainContainer.load();
        console.log(`ROOT: All loaded`);
    }

    process.container = mainContainer;
    process.setMaxListeners(100);

    process.once("exit", function(){
        mainContainer.unload();
    });

    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled Rejection at:', p, 'reason:', reason);
    });

    __startRoot();
})();
