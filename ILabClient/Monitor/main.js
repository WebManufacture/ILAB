ConfManager = {};

NodeItem = {};

NodeItem.Colors = ["#FFFFFF", "#FF0000", "#FF33FF", "#99CCFF", "#0099FF", "#33FFCC", "#99FF33", "#CCFF33", "#FFFF00", "#FFCC00", "#FF6633", "#9966FF"];

NodeItem.NodeClick = function () {
    JsonEditor.EditObject(this.config, this.key);
};

ConfManager.sections = {};

ConfManager.States = ["loading", "killed", "exited", "paused", "error", "idle", "stopping", "working"];
ConfManager.STATUS_LOADING = 0;
ConfManager.STATUS_KILLED = 1;
ConfManager.STATUS_EXITED = 2;
ConfManager.STATUS_PAUSED = 3;
ConfManager.STATUS_ERROR = 4;
ConfManager.STATUS_IDLE = 5;
ConfManager.STATUS_STOPPING = 6;
ConfManager.STATUS_WORKING = 7;

ConfManager.Init = function () {
    var url = "ws://localhost:5700";
    if (Request.Params.url){
      url = "ws://" + Request.Params.url;
      ConfManager.CreateSection(url, url, LocalNodesBlock);
    } else {
      ConfManager.CreateSection("Localhost", url, LocalNodesBlock);
    }
};

ConfManager.CreateSection = function(name, baseUrl, sectionBlock){
    var section = {
        name: name,
        services: {},
        configs: {},
        url: baseUrl,
        servicesManager: null,
        configService: null,
        id: sectionBlock && sectionBlock.id ? sectionBlock.id : (Math.random() + "").replace("0.", "")
    };
    ConfManager.sections[section.id] = section;
    loggerDiv = WS.Body.div(".logger");
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
        }).catch((error)=>{
          section.services.each((service)=>{
              var id = service.resultId;
              ConfManager.ConnectServiceLog(baseUrl, id);
              service.config = {};
          });
          section.configs = {};
          ConfManager.ShowSection(section, sectionBlock);
        })
    }).then((configs) => {
        if (configs){
          section.services.each((service)=>{
              var id = service.resultId;
              ConfManager.ConnectServiceLog(baseUrl, id);
              service.config = configs[id] ? configs[id] : {};
          });
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
          ConfManager.ShowSection(section, sectionBlock);
        }
    });
};

ConfManager.ConnectServiceLog = function(baseUrl, serviceId){
    ServiceProxy.Connect(baseUrl + "/" + serviceId).then((service) => {
        if (service){
            service.emit = function(name, msg){
                var line = logBox.div(".line");
                line.div(".service-type", service.serviceType);
                line.div(".service-name", service.serviceId);
                line.div(".event-name", name);
                for (var i = 1; i < arguments.length; i++){
                  line.div(".message", JSON.stringify(arguments[i]));
                }
                loggerDiv.ins(line);
                return this.__proto__.emit.apply(this, arguments);
            };
        }
    }).catch((error)=>{
      console.error("Error attaching log:", error)
    });
}


ConfManager.ShowSection = function(section, sectionDiv){
    if (typeof section == 'string') {
        section = ConfManager.sections[section.id];
    }
    if (!section) return;
    if (!sectionDiv) return;
    sectionDiv.set("@sectionName", section.name);
    sectionDiv.add(".section");
    sectionDiv.innerHTML = "";
    var header = sectionDiv.div(".section-header");
    header.div(".section-name", section.name);
    header.div(".section-url", section.url);
    section.services.each((service)=>{
        var elem = ConfManager.CreateNodeItem(service, section);
        sectionDiv.add(elem);
    });
    C.Process(sectionDiv, "ui-processing");
};

ConfManager.CreateNodeItem = function (node, section) {
    var item = NodeTemplate.clone();
    item.node = node;
    item.config = node.config;
    item.add("." + node.type.toLowerCase());
    if (node.Nodes) {
        item.add(".node-group");
    }
    item.section = section;
    item.url = section.url;
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
    var sectionId = "#" + section.id;
    section.servicesManager.on("service-started", (service)=>{
        console.log("Service working:" + section.name + ":" + service);
        DOM.get(sectionId + " #node_" + service).set("@status", "working");
    });
    section.servicesManager.on("service-loaded", (service)=>{
        console.log("Service loading:" + section.name + ":" + service);
        DOM.get(sectionId + " #node_" + service).set("@status", "loading");
    });
    section.servicesManager.on("service-exited", (service)=>{
        console.log("Service exited:" + section.name + ":" + service);
        DOM.get(sectionId + " #node_" + service).set("@status", "stopped");
    });

    //ConfManager.Channel.subscribe("/log/" + node.id, "/");
    //ConfManager.Channel.subscribe("/log.info,log.warn,log.error/" + node.id, "/");

    item.onclick = NodeItem.NodeClick;
    //item.readChannel = new HttpChannel("/channels/" + item.key + "/state", true);
    //item.writeChannel = new HttpChannel("/channels/" + item.key + "/control", false);
    //Server.Nodes[item.key] = item.channel;
    return item;
};

ConfManager.StartService = function (servicename) {
    ConfManager.sections["Localhost"].servicesManager.StartService(servicename).then(()=>{

    });
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

ConfManager.ShowLogs = function (item, url) {
    window.open("Monitor.htm?service=" + item.key+ "&url=" + item.url);
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
