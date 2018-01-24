var Service = useRoot("/System/Service.js");
var http = useSystem("http");
useModule("utils.js");

function myService(params){
    var self = this;
    // это публичная функция:

    this.GetEpamContent = function(num) {
        var options = {
            host: "dinner-club.com.ua",
            path: "/menu/"+num,
            search: "destination=menu/" + num,
            method: 'POST',
            headers: {
                'Content-Type':'application/x-www-form-urlencoded',
                'Cookie':'has_js=1; SESSe1fd3c1c09e911ee486b8bb2f59638d8=Cd-fLH3ujrWLu8KjMUGudtOe3DOCffmvDyhhPpnN180',
                'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
            }
        };
        return new Promise(function (resolve, reject) {
            var req = http.request(options, (res) => {
                console.log(req.headers);
                const { statusCode } = res;
                const contentType = res.headers['content-type'];

                let error;
                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
                }
                if (error) {
                    console.error(error.message);
                    // consume response data to free up memory
                    res.resume();
                    reject(error);
                    return;
                }

                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    resolve(rawData);
                });
            });
            req.write('name='+encodeURIComponent(params.username) + '&pass=' + encodeURIComponent(params.password));
            req.end();
        });
    };


    this.GetContent = function(num) {
        var options = {
            host: "dinner-club.com.ua",
            path: "/menu/"+num,

            method: 'GET'
        };
        return new Promise(function (resolve, reject) {
            http.get(options, (res) => {
                const { statusCode } = res;
                const contentType = res.headers['content-type'];

                let error;
                if (statusCode !== 200) {
                    error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
                }
                if (error) {
                    console.error(error.message);
                    // consume response data to free up memory
                    res.resume();
                    reject(error);
                    return;
                }

                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    resolve(rawData);
                });
            });
        });
    };
    return Service.call(this, "myService");
}

myService.serviceId = "myService";

Inherit(myService, Service, {
    //... тут какие-то внутренние методы сервиса

});

module.exports = myService;