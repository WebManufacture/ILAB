var appClass = {

    // Application Constructor
    initialize: function() {
        console.log('Binding events');
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {

        listeningElement.del();
        receivedElement.show();

        console.log('Received Event');
        /*
        setTimeout(()=>{
            app.hide();
            content.show();
            bluetoothSerial.list(
                function success(list){
                    list.forEach((item)=>{
                        const line = content.div(".line");
                        line.tag("span", item.name).add(".name").style.fontWeight = "bold";
                        delete item.name;
                        delete item.address;
                        line.tag("span", JSON.stringify(item)).style.marginLeft="2em";
                    });
                },
                function failure (msg){
                    console.error("looking error! " + msg);
                }
            );
        }, 2000);*/
    }
};

appClass.initialize();

