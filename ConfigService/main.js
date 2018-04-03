ConfManager = {};

NodeItem = {};

NodeItem.Colors = ["#FFFFFF", "#FF0000", "#FF33FF", "#99CCFF", "#0099FF", "#33FFCC", "#99FF33", "#CCFF33", "#FFFF00", "#FFCC00", "#FF6633", "#9966FF"];


NodeItem.NodeClick = function () {
    JsonEditor.EditObject(this.config, this.key);
};

ConfManager.sections = {};

ConfManager.Init = function () {
    ConfManager.CreateSection("Localhost", "ws://localhost:5700");

    //ConfManager.Channel = new Net.HMCH("./");
/*    Channels.on("/log", function (message, arg) {
        Notify.ShowMessage(arg);
    });
    /*
     var socket = io.connect('');
     socket.on('connect', function(s){
     console.log('connected');
     });

     socket.on('message', function(messages){
     console.log(messages);
     if (messages.length >= 2 ){
     var message = messages[0];
     var node = messages[1];
     var item = ConfManager.GetNode(node.key);
     if (item){
     ConfManager.UpdateItem(item, node);
     }
     Notify.ShowMessage(node);
     }
     });*/
};

ConfManager.States = ["loading", "killed", "exited", "paused", "error", "idle", "stopping", "working"];
ConfManager.STATUS_LOADING = 0;
ConfManager.STATUS_KILLED = 1;
ConfManager.STATUS_EXITED = 2;
ConfManager.STATUS_PAUSED = 3;
ConfManager.STATUS_ERROR = 4;
ConfManager.STATUS_IDLE = 5;
ConfManager.STATUS_STOPPING = 6;
ConfManager.STATUS_WORKING = 7;

ConfManager.CreateSection = function(name, baseUrl){
    var section = {
        name: name,
        services: {},
        configs: {},
        baseUrl: baseUrl,
        servicesManager: null,
        configService: null
    };
    ConfManager.sections[name] = section;
    ServiceProxy.Connect(baseUrl + "/ServicesManager").then((servicesManager) => {
        section.servicesManager = servicesManager;
        section.Start = function (item) {
            if (!item) return null;
            return servicesManager.StartService(item);
        };
        section.Stop = function (item) {
            if (!item) return null;
            return servicesManager.StopService(item);
        };
        section.Reset = function (item) {if (!item) return null;
            return servicesManager.ResetService(item);
        };

        return servicesManager.GetServicesInfo();
    }).then((services) => {
        section.services = services;
        return ServiceProxy.Connect(baseUrl + "/ConfigService").then((configService)=>{
            section.Remove = function (item) {
                if (!item) return null;
                return configService.DeleteConfig(item);
            };
            section.configService = configService;
            return configService.GetConfigs();
        })
    }).then((configs) => {
        var log = WS.Body.div(".logger");
        for (var item in section.services){
            var service = section.services[item];
            ServiceProxy.Connect(baseUrl + "/" + item).then((service) => {
                if (service){
                    service.emit = function(name, msg){
                        var line = DOM.div(".line");
                        line.div(".service-name", item);
                        line.div(".event-name", name);
                        line.div(".message", JSON.stringify(msg));
                        log.ins(line);
                    };
                }
            });
            section.services[item].config = configs[item] ? configs[item] : {};
        }
        for (var item in configs){
            if (!section.services[item]){
                section.services[item] = {
                    config: configs[item] ? configs[item] : {},
                    port: null,
                    type: "service",
                    state : ConfManager.STATUS_IDLE,
                    status: "idle"
                }
            }
        }
        section.configs = configs;
        ConfManager.ShowSection(section);
    });
};


ConfManager.ShowSection = function(section){
    if (typeof section == 'string') {
        section = ConfManager.sections[section];
    }
    if (!section) return;
    var sectionDiv = DOM.get("[sectionName='" + section.name + "']");
    if (!sectionDiv) {
        sectionDiv = NodesBlock.div(".section");
        sectionDiv.set("@sectionName", section.name);
    }
    sectionDiv.innerHTML = "";
    for (var id in section.services) {
        var elem = ConfManager.CreateNodeItem(section, section.services[id]);
        sectionDiv.add(elem);
    };
};

ConfManager.CreateNodeItem = function (section, node) {
    var item = NodeTemplate.clone();
    item.node = node;
    item.config = node.config;
    item.add("." + node.type.toLowerCase());
    if (node.Nodes) {
        item.add(".node-group");
    }
    item.section = section;
    item.key = node.id;
    item.id = "node_" + node.id;
    item.state = node.state;
   // if (!node.Nodes) item.style.backgroundColor = NodeItem.Colors[node.state];
    item.set("@status", node.status);
    var fields = item.all("[item-field]");
    fields.each(function (field) {
        var key = field.get("@item-field");
        if (node[key]) {
            field.textContent = node[key];
        }
        else {
            field.add(".empty");
        }
    });
    var fields = item.all("[config-field]");
    fields.each(function (field) {
        var key = field.get("@config-field");
        if (node.config[key]) {
            field.textContent = node.config[key];
        }
        else {
            field.add(".empty");
        }
    });

    section.servicesManager.on("service-started", (service)=>{
        console.log("Service working:" + service);
        DOM.get("#node_" + service).set("@status", "working");
    });
    section.servicesManager.on("service-loaded", (service)=>{
        console.log("Service loading:" + service);
        DOM.get("#node_" + service).set("@status", "loading");
    });
    section.servicesManager.on("service-exited", (service)=>{
        console.log("Service exited:" + service);
        DOM.get("#node_" + service).set("@status", "stopped");
    });

    //ConfManager.Channel.subscribe("/log/" + node.id, "/");
    //ConfManager.Channel.subscribe("/log.info,log.warn,log.error/" + node.id, "/");

    item.onclick = NodeItem.NodeClick;
    //item.readChannel = new HttpChannel("/channels/" + item.key + "/state", true);
    //item.writeChannel = new HttpChannel("/channels/" + item.key + "/control", false);
    //Server.Nodes[item.key] = item.channel;
    return item;
};

ConfManager.Start = function (elem) {
    elem.section.Start(elem.key);
};

ConfManager.Stop = function (elem) {
    elem.section.Stop(elem.key);
};

ConfManager.Reset = function (elem) {
    elem.section.Reset(elem.key);
};

ConfManager.Remove = function (elem) {
    elem.section.Stop(elem.key);
};

ConfManager.stateChanged = function (result) {
    //var data = JSON.parse(result);
    //ConfManager.UpdateItem(DOM("#obj" + data.key), data);
};

ConfManager.OnServerMessage = function (message) {
    if (message.key) {
        ConfManager.UpdateItem(DOM("#obj" + message.key), message);
    }
    if (message.forkId) {
        Notify.Show(DOM("#obj" + message.forkId).get("@data-host") + "\n" + message.text);
    }
}

ConfManager.UpdateItem = function (item, data) {
    item.set("@data-state", data.state);
}

ConfManager.ShowLogs = function (item) {
    window.open("Monitoring.htm?fork=" + item.key);
};

ConfManager.GetNode = function (nodeId) {
    return DOM("#node_" + nodeId);
};

ConfManager.LogsLoaded = function (result, status) {
    if (status == 200) {
        var logs = JSON.parse(result);
        for (var i = 0; i < logs.length; i++) {
            var log = logs[i];
            DOM("#Logs").div("." + log.type, log.message);
        }

    }
    else {
        Notify.Error("Logs not loaded: " + status);
    }
};

ConfManager.InitNodesBlock = function (node, parent) {
    if (!parent) parent = NodesBlock;
    var nitem = parent.add(ConfManager.CreateNodeItem(node));
    if (node.Nodes) {
        var citems = nitem.get(".child-nodes");
        if (!citems) citems = nitem.div(".child-nodes");
        for (var id in node.Nodes) {
            ConfManager.InitNodesBlock(node.Nodes[id], citems);
        }
    }
    ;
}

ConfManager.ConfigsLoaded = function (result, status) {
    if (status == 200) {
        ConfManager.DisplayConfigs(JSON.parse(result));
        //DOM("#Config").add(" " + result);
    }
    else {
        Notify.Error("Logs not loaded: " + status);
    }
};

ConfManager.DisplayConfigs = function (result) {
    var configsSorted = result.sort(ConfManager.SortByPath);
    for (var i = 0; i < configsSorted.length; i++) {
        var configPath = configsSorted[i].path;
        var configID = configsSorted[i]._id;
        delete configsSorted[i].path;
        delete configsSorted[i]._id;
        var data = JSON.stringify(configsSorted[i]);
        var pathObj = DOM.formatJSON(data);
        pathObj.AttrProperty('key');
        pathObj.id = 'id' + configID;
        pathObj.key = configID;
        ConfManager.FormatNodeItem(pathObj, data);
        //var pathDiv = DOM.div('.path', configPath);
        pathObj.ins(DOM.div('.path', configPath));
        DOM("#Config").add(DOM.div(pathObj));
    }
    ;
};

ConfManager.SortByPath = function (a, b) {
    return a.path > b.path ? 1 : -1;
};


WS.DOMload(ConfManager.Init);