var myWorker = new SharedWorker("ilab.js");

myWorker.port.start();


myWorker.port.onerror = function(err) {
    console.error(err);
}

myWorker.port.onmessage = function(e) {
    console.log('Message received from worker');
    console.log(e);
};

myWorker.port.onmessageerror = function(e) {
    console.error(e);
};
