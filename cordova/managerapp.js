
DOM("#Content").onclick = function(){
    //window.location = window.location;
}

function list(){
    bluetoothSerial.list(
        function success(list){
            DOM("#Content").textContent = JSON.stringify(list);
        }, 
        function failure (msg){
            DOM("#Content").textContent = "looking error! " + msg;
    });
};

setTimeout(function() {
    //C.Process(DOM("#Main"), "ui-processing");
    list();
}, 100);
