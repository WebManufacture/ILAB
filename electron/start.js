//hardware
if (window.WS){
    WS.DOMload(async () => {
        if (ilabStarted) {
            RunUIServices();
        } else {
            if (window.electron){
                electron.ipcRenderer.on("services-started", function (
                    event,
                    data
                ) {
                    console.log(">> services-started");
                    ilabStarted = true;
                    RunUIServices();
                });
            }
        }
        if (window.electron){
            electron.ipcRenderer.send("dom-ready");
        }
    });
}

async function RunUIServices() {
              sm = await ServiceProxy.Connect("ServicesManager");
            return sm;
}

function closeWindow() {
    window.close();
}

function maximizeWindow() {
    electron.ipcRenderer.send("maximize-message");
    DOM.get("#maximize").hide();
    DOM.get("#minimize").show();
}

function unmaximizeWindow() {
    electron.ipcRenderer.send("unmaximize-message");
    DOM.get("#minimize").hide();
    DOM.get("#maximize").show();
}

function minimizeWindow() {
    electron.ipcRenderer.send("minimize-message");
}
