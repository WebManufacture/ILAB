self.Frame = {};

Frame = { isChild : false };

Frame.ilabPath =  "/ILab-Client";
Frame.SystemPath = Frame.ilabPath + "/System/";
Frame.ModulesPath = Frame.ilabPath + "/Modules/";
Frame.ServicesPath = Frame.ilabPath + "/Services/";
Frame.Nodes = {};
Frame.Modules = [];
Frame.Services = {};

Frame.serviceId = "ServicesManager";

var ServicesManager = useSystem("ServicesManager");

Frame._initFrame = function () {
    console.log("Starting Browser ILAB v3.5.3");
    try {
        let debugMode = false;
        require("config.js");
        useSystem("ServicesManages.js");
        var servicesManager = new ServicesManager();
        servicesManager.on("error", function (err) {
            if (err.serviceId) {
                console.log("Service error: "  + err.serviceId);
            }
            console.error(err);
            err.handled = true;
        });
        servicesManager.on("service-started", function (serviceId, port) {
            console.log("Service started: " + serviceId + " on TCP " + port);
        });
    }
    catch (err) {
        console.log("RootError: ");
        console.error(err);
    }
};

Frame._initFrame();