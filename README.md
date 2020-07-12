Лекция по теме:
https://youtu.be/Pl8CxkeKgmU

Презентация тут:
https://docs.google.com/presentation/d/12lofdEfT3a1tk7b0iFUifS8nZMYA_Oq3sWZD_mGPwUU/edit?usp=sharing

Оглавление:
========================
* [УСТАНОВКА](#УСТАНОВКА)
* [ЗАПУСК И ПЕРВЫЕ ШАГИ](#ЗАПУСК-И-ПЕРВЫЕ-ШАГИ)
* [Запуск Electron](#Запуск-Electron)
* [АРХИТЕКТУРА ILAB3.0](#АРХИТЕКТУРА ILAB3.0)


УСТАНОВКА
========================

    git clone http://github.com/WebManufacture/ILAB-3.0
    cd ILAB-3.0
    npm install
    node RootService.js --demo

 Для пользователей UBUNTU, убедитесь, что вы пользуетесь версией NODE >= 8. Для этого наберите -

    node -v

  Если у вас версия 4.7.х то вам необходимо обновить версию node.
  Для этого мы рекоммендуем NVM.
  https://github.com/creationix/nvm/blob/master/README.md
  После установки пакета и node нужной версии, произведите установку ILAB, как описано выше.

  Для запуска Electron-приложения читайте [Запуск Electron](#Electron)

ЗАПУСК И ПЕРВЫЕ ШАГИ:
========================
Для запуска "чистого" ILAB-3.0, который содержит исключительно ServicesManager,
достаточно базовой команды:

    node RootService.js

Для того, чтобы стартовать минимальный набор сервисов, нужно добавить файл config.json в корень ILAB-3.0, можно скопировать его из файла config-sample.json, который лежит там же. После этого можно использовать преконфигурированную загрузку:

    node RootService.js --config

Ну и для запуска своего сервиса, его можно добавить как в конфиг,
так и просто в командную строку. Причем можно добавлять несколько через пробел.

    node RootService.js myService.js

    node RootService.js --config myService.js

Кратко, о том, как написать свой сервис.
-------------------------
Структура папок сервера ILAB3.0 cейчас выглядит так:

    Modules\ - библиотечные функции и классы
    Services\ - сервисы, в том числе и ваши.
    System\  - базовые классы для работы сервера ILAB
    Storage\ - папка для хранения данных (база данных в файликах)
    RootService.js - главный скрипт, который нужно запускать
    config.json - конфигурация для сервисов, стартующих по ключу --config

Для того, чтобы создать свой сервис, создайте файл в папке "Services".
И назовите, его, к примеру "myService.js"

Запускать его будем командой:

    node RootService.js --config myService.js

Для того чтобы написать свой сервис, надо унаследовать его от Service. Как-то так:

    var Service = useSystem("Service.js")

    function myService(params){
        //Тут params это всегда объект, который передается в метод StartService, при старте вашего сервиса
        //Берется он, к примеру, из конфига.
        this.users = [
            { name : "Igor", status: "offline"},
            { name : "Caroline", status: "online"}
        ];
        var self = this;
        // это публичная функция:
        this.GetUsers = function(status) {
            return self.getUsersList(status);
        };
        return Service.call(this);
    }

    myService.serviceId = "MyService";

    Inherit(myService, Service, {
            //... тут какие-то внутренние методы сервиса
            getUsersList : function(status){
            var result = [];
            for(var i=0; i<this.users.length; i++)
                if(this.users[i].status==status) result.push(this.users[i]);
            return result;
        }
    })

    module.exports = myService;

После запуска, сервис myService будет доступен вам через Веб, или из другого сервиса, или сервера,
с помощью глобального класса ServiceProxy:

    //Первый параметр -- URL к сервису, или имя сервиса, если сервер на локальной машине
    //Например, можно указать так: "ws://localhost:5700/myService"
    //А можно так "myService"
    //Или "ws://web-manufacture.net:5700/ServicesManager" - если вы обращаетесь к серверу WM и  
    //Второй параметр -- произвольный объект, который попадет в конструктор вашего сервиса.
    ServiceProxy.Connect("ws://localhost:5700/myService", { param1 : "Какой-нибудь ваш параметр" }).then(function(service){
        //тут в переменной service доступен наш метод GetUsers в виде промиса.
        //то есть результат обрабатывается так:
        service.GetUsers("online").then(function(users){
            //Тут будет доступен результат в users
        }).catch(function(error){
            //не забывайте вставлять обработку ошибок!
        });
    }).catch(function(error){
        //Сюда мы попадем в случае, неудачного подключения к сервису.
    });

В случае, если вы пользуетесь сервисом из браузера, вам необходимо на страницу добавить ссылку на скрипт:

    //Для использования WebSocket версии через ServicesWebSocketProxy
    <script src="http://services.web-manufacture.net/ilab-socket.js" type="text/javascript"></script>

ЗАПУСК ELECTRON:
========================

cd electron
npm i
npm i -g electron
npm i -g electron-builder
electron electron/electron-root.js

АРХИТЕКТУРА ILAB3.0 (введение + обсуждение)
========================

### Микросервисная архитектура
Основная идея ILAB3 - микросервисная архитектура сервера, когда для решения задачи она разбивается не просто на модули в рамках единого приложения, а на несколько отдельных процессов, которые взаимодействуют между собой по TCP.

Удобство - такой архитектуры в лёгкой расширяемости (модули можно подключать и отключать на лету) и большей безопасности (изоляция процессов, если падает с ошибкой один процесс, другие остаются жить). В случае ILAB речь идёт о node-процессах (т.е. отдельных экземпляров node исполняющих разные скрипты), взаимодействующих (в основном) по расширенному json-rpc протоколу.

TCP, JsonSocket, ServiceProxy
-------------------------
Для того чтобы с процессом можно было общаться, в нём делается TCP-сервер https://nodejs.org/api/net.html (не путать с вебсокетами).
Это значит что такой сервер начинает слушать некий порт, к которому могут подключаться внешние клиенты. После подключения между ними устанавливается канал связи, по которому передаются какие-то данные.
В нашем случае по этому каналу в обе стороны передаются json-структуры, для чего используется класс JsonSocket и ServiceProxy

Класс JsonSocket
-------------------------
Вся работа с сокетами скрыта в классе JsonSocket (описан в файле modules/jsonsocket.js). По сути этот класс - обёртка над сокетом, для передачи по нему не байтов, а сразу json-обьектов и мы бы могли подписаться на событие не просто прихода байтов, а на событие "json", означающее "нам прислали новый json-обьект".
Для того чтобы подключиться к TCP-серверу пишем

    var socket = new JsonSocket(7000, '127.0.0.1');
что означает что мы хотим подключиться к 7000-му порту на машине c  ip=127.0.0.1
Чтобы послать такому серверу обьект jobj пишем что-то вроде

    socket.write(jobj); // так отправляем
Чтобы подписаться на приход данных от сервера пишем:

    socket.on('json', function (json) {   console.log(json); } ) ; // так слушаем.
Чтобы самому создать сервер, слушающий jsonsocket

    server = net.createServer() // создаём обычный сервер-сокет (апишный метод node.js)
и в реакции на его событие 'connection' (подключение нового клиента) создавать

    jsocket = new JsonSocket(socket)
теперь через jsocket можно отправлять данные клиенту по write и слушать данные от него подписываясь на событие "json".

На самом деле нам не обязательно знать как как он устроен, потому что их использование спрятано внутри кода сервисов и проксей. Это так, для понимания общих принципов. Например, чтобы понимать, что так можно передавать только обьекты, сериализуемые в json.

Процесс управляемый по json-rpc
-------------------------
Если наш процесс создал jsonsocket-сервер, он может слушать от внешних клиентов какие-то сообщения, уведомления, команды. Основная идея json-rpc - это Remote Procedure Call, т.е способ сказать серверу "выполни ка у себя процедуру Beep(20,5)" послав ему json-обьект вида

    { type:"method", name:"beep", args: [20,5] }.
Если мы хотим ещё и получить какой-нибудь ответ от сервера, к сообщению нужно добавить уникальный id, а сервер после успешного выполнения вернёт что-то с этим же id (по id мы понимаем, на какой именно запрос это был ответ). Наприме, вызываем метод получения списка юзеров со статусом "admin", отправляя:

    { type:"method", name:"getUsers", args: ["admin"], id:10 }.
Получаем в ответ

    {"result": ["Вася", "Петя", "Маша"], "error": null, "id":10}
Отдельный бонус в том, что такие методы можно вызывать действительно удалённо, т.е. передавая запрос не только от одного процесса к другому на одном компе, а удалённым серверам (если у них, конечно, открыты соответствующие порты, а ваш провайдер разрешает по этим портам общаться; у меня на работе, скажем, все порты кроме 80 и 443 для http закрыты злым админом; зато дома весь парк машин подключенных к роутеру видят порты друг друга). Это, в частности, позволяет делать масштабируемую систему, разнося её сервисы по разным машинам.
Подробнее - https://ru.wikipedia.org/wiki/JSON-RPC

Наши расширения также позволяют транслировать события по данному соединению от сервиса - подписчикам

    { type: "event", name: "file-changed", args: ["/lkmqlaw/qwqwd.htm"]}
    //И передавать бинарные стримы данных
	{ type: "binary", mime: "image/png", id: "2302234234", length: 4004023}
	//после чего нужно читать данные из базового socket минуя JsonSocket.

Прокси-обьекты, ServiceProxy
-------------------------
Всё сказанное выше не имело прямого отношения к ILAB3 :-) Точнее, это конечно происходит там внутри, но прелесть в том, что ilab будет за вас формировать json-пакеты и гонять их по сокетам.
Вам нужно будет написать только что-то типа

    proxyForMyRemoteService.Beep(20,5)
чтобы заставить ваш удалённый сервис 20 секунд пищать на частоте 5 мГц )) (если у него, конечно, реализована такая функция).

Что такое в данном proxyForMyRemoteService? Это такой обьект-посредник (прозрачный прокси-объект) для общения с удалённым сервером, поддерживающем наш json-rpc протокол; такие посредники у нас называются прокси.
В модуле ServiceProxy (или его вариациях, я написал ещё его вариант на промисах) и описан класс таких обьектов, делающих за нас нудную работу. Использование:

    var ServiceProxy = useModule('ServiceProxy'); // подключение модуля
    var proxy = new ServiceProxy(); // создание объекта
    proxy.attach(port, host, callback);
    /* подключение к сервису, работающему на машине с
    адресом host, слушающей порт port, в callback - функция которая выполняется когда
    подключение успешно завершено и можно начинать работать.*/
    //...
    //тут мы, положим уже уверены что подключение произошло
    proxy.beep(10,5) ;  // одна эта строка формирует json-пакет и шлёт его по сокету

Это собственно главное. Если вас интересует ответ вызыванного метода, нам нужно как-то прописать callback, который вызовется когда этот ответ придёт. Пока предлагается такой синтаксис

    proxy.getUsers("admin", function(result) { myusers = result; } ).
	//Т.е. идея передавать callback после списка аргументов функции.

Ещё у меня есть реализация на прокси:

    var ServiceProxyPromises = useModule('ServiceProxyPromises');
    var serviceName = "FilesService";
    var proxyP = new ServiceProxyPromises(serviceName); //Передаем имя сервиса к которому поключаемся. (не обязательно если мы используем Port и host)

    proxyP.attach(port, host).then(function () { //port, host указываются только если мы подключаемся к какому то удаленному сервису вне нашего сервера.
            proxyP.getUsers("admin").then(
                function(result) { console.log("Штук юзеров: " + result.length); },
            );           
        }).catch(function(err){
			console.log("Не удалось подключиться к сервису:" + serviceName);
			console.error(err);
		});

Если вы понимаете зачем нужны прокси, вы оцените прелесть подхода, для остальных он может показаться сложным и проще пользоваться просто колбэками.

https://github.com/WebManufacture/ILAB-3.0/tree/master/Modules - здесь в файлах "примеры использования ServiceProxy.txt", "ServiceProxyPromises.js" и "ServiceProxy.js" версии от AlfLearn! (За что ему благодарачка)
https://github.com/AlfLearn/ILAB-3.0  (Это его форк)


Сервисы
-------------------------
Для того, чтобы создать свой сервис, создайте файл в папке "Services".
И назовите, его, к примеру "myService.js"

Запускать его будем командой:

    node RootService.js --config myService.js

Для того чтобы написать свой сервис, надо унаследовать его от Service. Как-то так:

    var Service = useSystem("Service.js")

    function myService(params){
        //Тут params это всегда объект, который передается в метод StartService, при старте вашего сервиса
        //Берется он, к примеру, из конфига.
        this.users = [
            { name : "Igor", status: "offline"},
            { name : "Caroline", status: "online"}
        ];
        var self = this;
        // это публичная функция:
        this.GetUsers = function(status) {
            return self.getUsersList(status);
        };
        return Service.call(this);
    }

    myService.serviceId = "MyService";

    Inherit(myService, Service, {
            //... тут какие-то внутренние методы сервиса
            getUsersList : function(status){
            var result = [];
            for(var i=0; i<this.users.length; i++)
                if(this.users[i].status==status) result.push(this.users[i]);
            return result;
        }
    })

    module.exports = myService;

После запуска, сервис myService будет доступен вам через Веб, или из другого сервиса, или сервера,
с помощью глобального класса ServicesManager:

    //Второй параметр -- произвольный объект, который попадет в конструктор вашего сервиса.
    ServicesManager.Connect("myService", { param1 : "Какой-нибудь ваш параметр" }).then(function(service){
        //тут в переменной service доступен наш метод GetUsers в виде промиса.
        //то есть результат обрабатывается так:
        service.GetUsers("online").then(function(users){
            //Тут будет доступен результат в users
        }).catch(function(error){
            //не забывайте вставлять обработку ошибок!
        });
    }).catch(function(error){
        //Сюда мы попадем в случае, неудачного подключения к сервису.
    });

Сервисом мы будем называть процесс, который умеет понимать команды по нашему json-prc и с которым можно ощаться через наши proxy-обьекты. В принципе можно написать хоть произвольное node-приложение, лишь бы оно реализовало протокол. Но удобнее использовать готовый класс сервиса, который из коробки умеет не только слушать json-команды, но и интерпретировать их как вызов своих собственных методов.
Базовый класс сервиса описан в модуле Service.js

Обращаю внимание - публичные функции (т.е. доступные для rpc-вызовов) прописываются как явные свойства обьекта сервиса (а не его его прототипа). Т.е. только собственные методы обьекта сервиса (те которые hasOwnProperty) автоматически попадают в публичный интерфейс обьекта (upd - ещё туда не попадают функции, имена которых начинаются с "_", по принятному соглашению для именования как бы приватных свойств объектов).

Всё, теперь вы умеете создавать сервисы. Вы можете написать и запустить несколько разных node-скриптов реализующих в себе функционал сервисов, научить их обмениваться информацией и командами.

Но пока это всё ещё зоопарк сервисов, каждый из которых во-первых, нужно запускать вручную, во-вторых - чтобы один процесс обратился к другому он должен знать его порт. В этом нет ничего крамольного, например, mondodb слушает стандартный для него порт 27100; но мы-то знаем, что сервисов напишем много и разных и резервировать под каждый номера портов как-то неправильно, лучше же выдавать их динамически?

Потому автоматизируем управление "зоопарком".


Менеджер сервисов
Это такой сервис, который управляет другими сервисами. А сам он является сервисом потому, что им можно удалённо управлять - т.е. вызывать у него команды по созданию, остановке, выяснению статуса и прочему контролю над другими сервисами.

Менеджер сервисов при создании других сервисов передаёт им (через командную строку) номер порта, на котором они будут работать. Например, его просят сделать "userService", он ищет модуль с таким именем, запускает сервис, выдавая ему очередной номер порта (скажем, 4997) и запоминает всю информацию об этом сервисе (номер порта, pid для удаления процесса и т.п.).

Теперь другим процессам, чтобы подключиться к модулю userService не обязательно знать его порт. Достаточно знать только порт менеджера сервисов, создать прокси для общения с ним и спросить у него - "а скажи мне номер порта для userService". А дальше уже по полученному порту создавать прокси для общения уже с userService.
Менеджер сервисов объявлен в ServicesManager.js , но по состоянию на 5.07.2016 удалённо управлять им ещё нельзя :-)

Также в todo кому-то - автозагрузка сервисов по списку из config-файла.

Менеджер "узлов"
--------------------------
NodesManagerService.js - похож на менеджер сервисов, только управляет не сервисами, а "узлами сервера". "Узлы" (nodes) - это что-то вроде серверов, конечные пользователи сервисов. Например, KLAB - это "узел" (может называть его как-то вроде subserver?). На практике в WM "узлы" обычно описывают поддомены сайта, реализующие разные функционал. Хотя для локальных копий ILAB, скажем стоящих на ноуте и управляющих 3d-принтером, "узел", наверное, сможет означать и отдельную единицу внешнего оборудования. Отличие "узла" от "сервиса" примерно такое, как exe-шника от dll-ки (на вашем компьютере могут исполняться много разных программ, контролирумых виндой, которые могут использовать общие dll-библиотеки).

Update from <MiЯRoR>: "Узлы" обычно не доступны по описаному выше протоколу сервисов, и у них нет такого API, которое можно использовать через ServiceProxy.
Пример - Узел безопасности. (следит чтобы запросы к сервисам были авторизованы).
Сам он пользуется другими сервисами но API у него не доступно.


Самый главный скрипт - rootService.js
------------------------------
Практически ничего не делает. Его единственная задача - запустить сервисы и узлы сервера.
Ну, хорошо бы только те, что указаны в config-е, хотя и не обязательно (это может быть в конфигах самих запускаемых им модулей).
В минимальном варианте запускает Менеджер сервисов или менеджер узлов или и то и другое.
По-возможности сам он должен никода не падать, но если это всё же случится - перезапускаться обратно средствами ОС. Это достигается изоляцией главного процесса (в котором и выполняется RootService) от остальных сервисов (для которых стартуют дочерние процессы).

Фреймы
------------------------------
Фреймы - это запущенные экземпляры node.exe. Если в винде посмотреть через диспетчер задач на запущенные node-процессы, мы увидим что все сервисы - это на самом деле "node ServiceFrame.js", исполняющие каждый свой сервис. А все "узлы" - это "node NodeFrame.js", обсулуживащие каждый свой, эм, поддомен.

Это означает, что технически ваш сервис "myService" - это экземляр ServiceFrame.js в глубинах которого сделано что-то вроде require("myService"), а узел "myNode" - соответственно исполняемый NodeFrame.js в глубинах которого - require("myMode").

Для вас это означает, что вам (в коде вашего сервиса ил узла) доступен глобальный обьект Frame, в котором уже хранятся некоторые переменные окружения. Например, жизненно необходимый для общения с другими сервисами Frame.servicesManagerPort , через который вы можете общаться с менеджером сервисов.


Как начать писать?
-----------------------------
Написать свой сервис и узел. Серьёзно, напишите сервис показывающий текущее время и узел, который будет спрашивать у него это время через прокси и выводить в консоль. А потом, когда мы поймём, как делать узлы веб-сервера - ещё и узел с веб-интерфейсом.

________________________________________
ВНИМАНИЕ, дальнеший текст уже отчасти мои (AlfLearn) домыслы
Возможно у разработчиков ILAB иное видение.
Здесь я (https://github.com/AlfLearn/ILAB-3.0) описываю то, как сам решал бы эту задачу
Возможно, здесь будет обсуждение.
________________________________________
Роутинг, веб-сервер, статические и динамические ресурсы
------------------------------------------
Внешний мир обычно смотрит на сервер через 80-й порт и http-протокол. Когда браузер стучится на сервер, он по умолчанию пытается подключиться к его 80-му порту. И это порт один на всех. А "узлов" у нас много, что делать? Распределить возможные запросы по разным узлам; так, всё идущее на http://klab.web-manufacture.net/ будет перенаправляться узлу KLAB, а всё с http://sandbox.web-manufacture.net/ - видимо на узел "sandbox".

Также каждый такой узел-поддомен может хотеть иметь свой "сайт" - набор html-страничек, файловую систему - то что называется "статический контент". Для этого у каждого узла может быть своя папка которая отображается (maping) на систему папок сайта. Этим занимается сервер статических файлов - т.е. когда придёт запрос "klab.web-manufacture.net/editors/supereditor.html", а с klab у нас сопоставлена папка "D:\MyDocuments\klab\" он должен будет отдать файл "D:\MyDocuments\klab\editors/supereditor.html".

Различие статики и динамики. Статичный контент сайта (отдельного узла) меняется редко и представляет собой просто содержимое какой-то папки. Чтобы его отдать, вобщем-то даже участие узла не требуется, обычно это просто сайт для работы с этим узлом уже через динамические запросы.

Динамические данные перенаправляются роутингом уже к "узлам", потому что только они знают как на них отвечать. Потому если вы послали, скажем ajax-запрос GET на "klab.web-manufacture.net/api/users?status=10", роутер уже должен перенаправить такой запрос узлу KLAB (в виде json-пакета с полем werb:"get" и телом запроса), дождаться ответа от него и вернуть веб-пользователю.

Как различать статические и динамические ресурсы? Если запрос похож на имя файла, скорее всего хотят статику (но если такой файл таки не найден, можно попробовать узнать его уже динамически). Если запрос содержит "?" знак, скорее всего это динамика. Но по-хорошему, лучше просто прописать в конфиге шаблон запросов, трактуемых как динамические (например, всё начинающееся с "api/"), а остальное обрабатывать как статику.

В принципе, всеми вопросами отдачи по http-во внешний мир может заниматься один сервис - "вебсервер". Каждый узел, желающий отдавать динамический контент, видимо, должен будет создать в себе нечто (тоже сервис?), слушающее запросы от веб-сервера, что скорее всего будет оформлено в виде класса ServerNode, т.е. "серверного узла", который из коробки будет уметь слушать json-представление http-запросов и как-то отвечать на них.

По-видимому, этим должны заниматься FilesService.js, RoutingService.js, StaticService.js, но их устройство меня несколько пугает и я не уверен, что они рабочие, потому что тупо скорпированы в Server3 из ILAB-master :-)  (по состоянию на 5.07.2016)

Ещё есть проблема вебсокетов. В общем случае я не представляю как их данные транслировать узлам. В частном случае - у веб-сервера может быть socket.io и все коннекты на разные поддомены от разных юзеров мы будем транслировать в json-rpc. Так что для узлов это будет только один из видов сообщений.

В некоторых случаях (личные папки, группы юзеров), право на просмотр какого-то фрагмента даже статического контента может определяться профилем юзера. Потому можно или каждый раз спрашивать у узла, разрешено ли показать данный ресурс (папку или файл), прежде чем отдавать статику. Или определить хотя бы шаблон таких запросов, для которых требуются такие подтверждения (скажем, всё начинающееся с "klab.web-manufacture.net/users" требует подтверждения, остальное - нет).

Потому переходим к вопросу авторизации.


Авторизация, права доступа
------------------------------------
Авторизация. Если кому-то где-то нужно ограничить доступ к ресурсам узла, нужно проверять токен, приходящий в куки сессии. Токен выдаётся при авторизации (если кто не знает, это такой разовый пароль доступа, который вам выдают на время сессии за правильно введённый постоянный пароль и даже незарегистрированным юзерам, просто чтобы узнавать их, когда они заходят с другой страницы того же браузера). Куки свои для каждого домена, потому на каждом придётся авторизоваться отдельно.

Сервис авторизации плотно связан с сервисом веб-сервера, потому что при успешной авторизации веб-сервер должен будет записать токен в куки (а доступ к ним имеет только веб-сервер). Возможно его даже можно сделать частью веб-сервера.

Редактируемые папки юзеров и git
------------------------------------
Редактируемые папки - это та часть статического контента, которую может редактировать данный юзер в зависимости от своих прав. Права определяются сервисом авторизации (т.е. при выполнении опасного действия от имени юзера, узел должен спросить, а имеет ли юзер с таким логином и токеном такие права), хотя конечное решение всё равно за узлом.

Манипуляции с git - это просто надстройка над редактором файлов и папок. В простейшем случае она означает "я тут внёс несколько изменений, давайте сохраним мою версию", т.е. сделаем save состояния папки, как делаем сейвы в компьютерных играх. Тут можно пофантазировать над коллективным редактированием, но такие вещи лучше всё же делать в личных папках, отдельных для каждого юзера; которые можно защитить хотя бы от редактирования другими, а по желанию - и от просмотра.
