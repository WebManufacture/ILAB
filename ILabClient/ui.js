if (!UsingDOM("Ui")){

    ui.id =  "UI";
    ui.url =  "ui.js";

    ui.info = console.info;
    ui.error = console.error;

    ui.Init = function(){
        Ev.CreateEvent("OnActionEvent", ui);
        ui.info("UI Initializing");
        C.Process(WS.Body, "ui-processing");
        ui.namespace = M.Namespaces.ui;
        ui.componentStorage = new Storage();
    };

    ui.ModuleInitialized = function(url, module){
        //M.OnModuleRegistered.unsubscribe(ui.ModuleInitialized, url);
        J.info("jasp-init", url);
        WS.Body.all(".component[component-url='" + url + "'].jasp-processing-uicomponents").del(".jasp-processing-uicomponents");
        if (module.initComponent){
            var context = { Condition: "ui-processing" };
            context.Selector = "";
            context.Process = function(element, context, param){
                module.initComponent.apply(this, arguments);
                element.OnComponentInitialized.fire();
            }
            context = C.Add(context);
            context.Selector = ".component[component-url='" + url + "']:not(.jasp-processed-" + context.id + ")";
            C.ProcessContext(WS.Body, context);
        }
        return "del";
    };

    ui.ComponentContext = {
        Condition: "ui-processing",
        id : "uicomponents",
        Selector : ".component[component-url]:not(.jasp-processed-uicomponents)",
        Process : function(element){
            var url = element.componentUrl = element.attr("component-url");
            var wait = element.wait = element.attr("wait");
            url = url.toLowerCase();
            element.set("@component-url", url);
            Ev.CreateEvent("OnComponentInitialized", element);
            var module = M.GetModuleByUrl(url);
            if (module) {
                if (module.initComponent){
                    module.initComponent.apply(this, arguments);
                    element.OnComponentInitialized.fire();
                }
            }
            else{
                M.OnModuleRegistered.subscribe(ui.ModuleInitialized, url);
                element.module = M.Load(url, "component " + element.ToString());
                return false;
            }
            return true;
        }
    };


    C.Add(ui.ComponentContext);

    ui.templateElementProcessorFunction = function(condition, parentContextId, processSelf){
        return  function(protoElement){
            protoElement.add(".prototype");
            WS.Body.add(protoElement);
            var forSelector = protoElement.get("@for");
            var contextId = (parentContextId + "-context-" + Math.random()).replace("0.","");
            protoElement.setAttribute("context-id", contextId);
            var context = {
                Condition: condition,
                id : contextId,
                Selector : forSelector + ":not(.jasp-processed-" + contextId + ")",
                Process : function(element){
                    var title = protoElement.get("@title");
                    if (title){
                        element.add("@title", title);
                    }
                    var content = protoElement.innerHTML;
                    const regex = /{\w+}/ig;
                    let array1 = regex.exec(content);

                    if (array1){
                        array1.forEach(item => {
                            item = item.replace("{", "");
                            item = item.replace("}", "");
                            content = content.replace("{" + item + "}", element[item]);
                        });
                    }
                    element.innerHTML = content;
                    return true;
                }
            };
            if (processSelf) context.processSelf = true;
            C.Add(context);
            return true;
        }
    }

    C.Add({
        Condition: "module-parsing",
        id : "ui-inner-templates-parser",
        Selector : "inner-template:not(.jasp-processed-ui-inner-templates-parser)",
        Process : ui.templateElementProcessorFunction("ui-processing", "ui-inner-templates-parser")
    });

    C.Add({
        Condition: "ui-processing",
        id : "ui-inner-templates",
        Selector : "inner-template:not(.jasp-processed-ui-inner-templates)",
        Process :ui.templateElementProcessorFunction("ui-processing", "ui-inner-templates")
    });

    C.Add({
        Condition: "ui-processing",
        id : "ui-templates",
        Selector : "template:not(.jasp-processed-ui-templates)",
        Process : ui.templateElementProcessorFunction("ui-processing", "ui-templates", true)
    });

    C.Add({
        Condition: "ui-processing",
        id : "ui-dinamic-templates",
        Selector : "template:not(.jasp-processed-ui-dinamic-templates)",
        Process : ui.templateElementProcessorFunction("ui-element-processing", "ui-dinamic-templates", true)
    });

    C.Add({
        Condition: "module-parsing",
        id : "ui-templates-in-module-parser",
        Selector : "template:not(.jasp-processed-ui-templates-in-module-parser)",
        Process : ui.templateElementProcessorFunction("ui-processing", "ui-templates-in-module-parser", true)
    });

    WS.onAddElem = function(element){
        if (element){
            //C.Process(element,"ui-element-processing");
        }
    };


    ui.EffectParsingContext = {
        Condition: "ui-processing",
        id : "ui-effects",
        Selector : "effect:not(.jasp-processed-ui-effects)",
        Process : function(effectElement){
            var asel = effectElement.uiActionSelector = effectElement.attr("for");
            var atype = effectElement.uiActionType = effectElement.attr("type");
            var scope = effectElement.uiActionScope = effectElement.attr("scope");
            var check = effectElement.uiActionCheck = effectElement.attr("check");
            var isCondition = effectElement.uiActionIs = effectElement.attr("is");
            if (!atype){
                atype = effectElement.uiActionType = effectElement.attr("action-type");
            }
            if (!atype) {
                ui.Error("Element " + effectElement.ToString() + " has no action-type or atype attribute!");
                return true;
            }
            if (!scope){
                scope = effectElement.uiActionScope = "parent";
            }
            var aevent = effectElement.uiActionEvent = effectElement.attr("on");
            if (!aevent){
                aevent = effectElement.uiActionEvent = ":click";
            }
            if (isCondition && !check) effectElement.uiActionCheck = check = "parent";
            var handler = ui.UIActionHandlers[atype];
            if (handler){
                effectElement.uiActionHandler = () => {
                    ui.info("UI Action: " + effectElement.uiActionType + ":" + effectElement.uiActionEvent + " -> " + effectElement.uiActionSelector);
                    window.setTimeout(function(){
                        try{
                            if (effectElement.uiActionCheck == "parent"){
                                if (effectElement.uiActionIs){
                                    if (!effectElement.parentElement.is(effectElement.uiActionIs)){
                                        return;
                                    }
                                }
                            } else {
                                var lelement = DOM.get(effectElement.uiActionCheck);
                                if (!lelement) return;
                                if (effectElement.uiActionIs){
                                    if (!lelement.is(effectElement.uiActionIs)){
                                        return;
                                    }
                                }
                            }
                            handler(effectElement, effectElement.uiActionType, effectElement.uiActionSelector, effectElement.uiActionEvent);
                        }
                        catch(err){
                            console.log(err);
                        }
                    }, 100);
                };
            }
            else{
                ui.Error("Element " + effectElement.ToString() + " has unknown event type: " + atype);
                return true;
            }

            if (aevent.start(":")){
                aevent = ui.ElementEventNames[aevent];
                if (aevent){
                    if (scope == "parent"){
                        effectElement.parentElement.addEventListener(aevent, effectElement.uiActionHandler);
                    } else {
                        var elems = DOM.all(scope);
                        elems.each((elem)=>{
                            elem.addEventListener(aevent, effectElement.uiActionHandler);
                        });
                    }
                }
                else{
                    ui.Error("Element " + effectElement.ToString() + " has unknown event emitter: " + aevent);
                }
            }
            else{
                ui.OnActionEvent.subscribe(ui.UIActionRecurseHandler, aevent);
                ui.info("Subscribe on " + aevent + " action " + aname + ":" + atype + " for " + asel);
            }
            return true;
        }
    };


    C.Add(ui.EffectParsingContext);

    ui.ElementEventNames = {
        ":click" : "click",
        ":hover" : "mouseover",
        ":d-click" : "dblclick",
        ":drag" : "drag",
        ":drop" : "drop",
        ":focus": "focus",
        ":blur": "blur",
        ":key-down": "keydown",
        ":key-up": "keyup",
        ":touchmove": "touchmove",
        ":touchend": "touchend",
        ":touchstart": "touchstart"
    };

    //<div class='action' on=":click" atype="class-toggle" for="#Item22" set=".invisible.showed">

    ui.UIActionContext = {
        Condition: "ui-processing",
        id : "uiaction",
        Selector : ".ui-action:not(.jasp-processed-uiaction), [action-type]:not(.jasp-processed-uiaction)",
        Process : function(element){
            var asel = element.uiActionSelector = element.attr("for");
            var atype = element.uiActionType = element.attr("atype");
            var target = element.uiActionTarget = element.attr("target");
            if (!atype){
                atype = element.uiActionType = element.attr("action-type");
            }
            if (!atype) {
                ui.Error("Element " + element.ToString() + " has no action-type or atype attribute!");
                return true;
            }

            var aevent = element.uiActionEvent = element.attr("on");
            if (!aevent){
                aevent = element.uiActionEvent = ":click";
            }

            var handler = ui.UIActionHandlers[atype];
            if (handler){
                element.uiActionHandler = function(){
                    ui.info("UI Action: " + element.uiActionType + ":" + element.uiActionEvent + " -> " + element.uiActionSelector);
                    window.setTimeout(function(){
                        try{
                            handler(element, element.uiActionType, element.uiActionSelector, element.uiActionEvent)
                        }
                        catch(err){
                            console.log(err);
                        }
                    }, 100);
                };
            }
            else{
                ui.Error("Element " + element.ToString() + " has unknown event type: " + atype);
                return true;
            }

            if (aevent.start(":")){
                aevent = ui.ElementEvents[aevent];
                if (aevent){
                    element[aevent] = element.uiActionHandler;
                }
                else{
                    ui.Error("Element " + element.ToString() + " has unknown event emitter: " + aevent);
                }
            }
            else{
                ui.OnActionEvent.subscribe(ui.UIActionRecurseHandler, aevent);
                ui.info("Subscribe on " + aevent + " action " + aname + ":" + atype + " for " + asel);
            }
            return true;
        }
    };

    C.Add(ui.UIActionContext);

    ui.UIActionRecurseHandler = function(ename, elem) {
        ui.info("Recurse event emitted: " + ename);
        if (elem){
            elem.uiActionHandler();
        }
    };

    ui.UIActionHandlers = {
        "event" : function(elem, atype, asel, aevent){
            ui.OnActionEvent.fire(asel, elem)
        },

        "class-toggle" : function(elem, atype, asel, aevent){
            var aname = elem.attr("set");
            if (aname){
                var target = DOM._all(asel);
                target.each(function(elem){
                    if (elem._is(aname)){
                        elem._del(aname);
                    }
                    else{
                        elem._add(aname)
                    }
                });
            }
        },

        "show" : function(elem, atype, asel, aevent){
            var target = DOM._all(asel);
            target.each(function(elem){
                this.show();
            });
        },

        "hide" : function(elem, atype, asel, aevent){
            var target = DOM._all(asel);
            target.each(function(elem){
                this.hide();
            });
        },


        "visibility-toggle" : function(elem, atype, asel, aevent){
            var target = DOM._all(asel);
            target.each(function(elem){
                if (this._is(".invisible")){
                    this.show();
                }
                else{
                    this.hide()
                }
            });
        },

        "ins" : function(elem, atype, asel, aevent){
            var aname = elem.attr("set");
            if (aname){
                var target = DOM._all(asel);
                target._ins(aname);
            }
        },

        "set" : function(elem, atype, asel, aevent){
            var aname = elem.attr("set");
            if (aname){
                var value = null;
                var target = DOM._all(asel);
                if (aname.contains("=")){
                    var parts = aname.split("=");
                    aname = parts[0];
                    value = parts[1];
                }
                target._set(aname, value);
            }
        },
    };

    ui.UIActionHandlers["class-on"] =
        ui.UIActionHandlers["add"] =
            function(elem, atype, asel, aevent){
                var aname = elem.attr("add");
                if (aname){
                    var target = DOM._all(asel);
                    target._add(aname);
                }
            };

    ui.UIActionHandlers["class-off"] =
        ui.UIActionHandlers["del"] =
            function(elem, atype, asel, aevent){
                var aname = elem.attr("del");
                if (aname){
                    var target = DOM._all(asel);
                    target._del(aname);
                }
            };

    ui.ElementEvents = {
        ":click" : "onclick",
        ":hover" : "onmouseover",
        ":d-click" : "ondblclick",
        ":receive" : "ondropreceive",
        ":drop" : "OnDrop"
    };

    ui.getNamespace = function(namespace){
        var parts = namespace.split('.');
        if (parts[0].toLowerCase() == "ui"){
            parts.shift();
        }
        var ns = ui.namespace;
        for (var i = 0; i < parts.length; i++){
            if (ns[parts[i]]){
                ns = ns[parts[i]];
            }
            else{
                ns = null;
                ui.error("UI namespace " + namespace + " not found!");
                return null;
            }
        }
        return ns;
    }


    ui.createNamespace = function(namespace){
        var parts = namespace.split('.');
        if (parts[0].toLowerCase() == "ui"){
            parts.shift();
        }
        var ns = ui.namespace;
        for (var i = 0; i < parts.length; i++){
            if (!ns[parts[i]]){
                ns[parts[i]] = {};
            }
            ns = ns[parts[i]];
        }
        return ns;
    }

    ui.baseComponent = function(options){
        if (!options) options = {};
        if (typeof(options) == "object"){
            this.classes = options.classes;
            this.tags = options.tags;
            this.id = options.id;
            if (options.childs){
                this.childs = [];
                for (var i = 0; i < options.childs.length; i++){
                    var child = ui.create(childs[i]);
                    child.parent = this;
                    this.childs.push(child);
                }
            }
        }
        if (!this.id) this.id = this.type + Math.random().toString().replace("0.", "");
        if (typeof options.dom == "object" && options.dom.nodeType == 1){
            this.render(options.dom);
        }
    }

    Inherit(ui.baseComponent, EventEmitter, {
        type : "BaseComponent",

        render : function(dom){
            if (this.childs){
                for (var i = 0; i < this.childs.length; i++){
                    this.childs[i].render(dom);
                }
            }
        },

        show : function(timeout){
            var me = this;
            if (typeof timeout == 'number'){
                setTimeout(function() {
                    this.hide();
                }, timeout);
            }
            this.dom.show();
        },

        hide : function(){
            this.dom.hide();
        },

        remove : function(){
            this.dom.map = null;
            this.dom.del();
        },

        map : function(obj){

        }
    })

    ui.register = function(namespace, inherit, creator, mixin){
        if (creator) {
            if (typeof(inherit) == "function" && typeof(creator) == "object"){
                mixin = creator;
                creator = inherit;
                inherit = ui.baseComponent;
            }
        }
        else{
            if (typeof(inherit) == "function"){
                creator = inherit;
                inherit = ui.baseComponent;
            }
            if (typeof(inherit) == "string"){
                creator = new Function();
            }
        }
        if (typeof(inherit) == "string"){
            var i_ns = ui.getNamespace(namespace);
            if (!i_ns) return null;
            inherit = i_ns.create;
        }
        var ns = ui.createNamespace(namespace)
        ns.create = creator;
        if (typeof inherit == "function"){
            Inherit(creator, inherit, mixin);
        }
        ns.base = inherit.prototype;
        creator.prototype.type = ns.type;
        creator.prototype.namespace = ns;
        ui.info("registered", "ui namespace v1 " + namespace);
        return ns;
    }

    ui.create = function(namespace, options){
        if (typeof namespace == "object"){
            options = arguments[1] = namespace;
            namespace = namespace.type;
        }
        var ns = ui.getNamespace(namespace);
        if (ns && typeof(ns.create) == "function"){
            return new ns.create(arguments[1],arguments[2],arguments[3],arguments[4],
                arguments[5],arguments[6],arguments[7],arguments[8]);
        }
        return null;
    }

    ui.onload = function(callback){
        if (M && M.OnModulesLoaded){
            if (M.modulesLoaded){
                callback();
            }
            else{
                M.OnModulesLoaded.subscribe(callback);
            }
        }
        else{
            WS.DOMload(function(){
                if (M.modulesLoaded){
                    callback();
                }
                else{
                    M.OnModulesLoaded.subscribe(callback);
                }
            });
        }
    }

    ui.ShadowEventEmitter = function(element){
        var self = this;
        this._super.apply(this, arguments);
        var baseOn = this.on;
        this.on = this.subscribe = function(name, handler){
            element.addEventListener(name, function(){
                return handler.apply(self, arguments);
            });
            return baseOn.apply(self, arguments);
        }
        element.on = function(name, handler){
            return self.on.apply(self, arguments);
        }
        element.emit = element.do = element.fire = function(){
            return self.emit.apply(self, arguments);
        }
        DOM.do("ui/component.initialized/" + element.tagName.toLowerCase());
        ui.info("initialized", "ui component v2 for  " + element.path);
    }

    Inherit(ui.ShadowEventEmitter, EventEmitter);

    ui.inherit = function(namespace, creator, mixin){
        creator.namespace = namespace;
        var selector = new Selector(namespace);
        var context = {
            Condition: "ui-processing",
            id : "uicomponentInitializer" + namespace,
            Selector : namespace + ":not(.initialized)",
            Process : function(element){
                element.add(".initialized");
                element.shadow = new creator(element);
                Channels.emit("/ui-component-initialized/" + namespace, element, namespace);
                return true;
            }
        };
        C.Add(context);
        DOM.do("ui/component/" + selector.type + ".registered");
        ui.info("registered", "ui component v2 for  " + selector.source);
        return Inherit(creator, ui.ShadowEventEmitter, mixin);
    }

    ui.define = function(selector, creator, base, mixin, extendValue){

        if (!selector || !creator) return;
        //Спецификация CustomElements не работает с ES5 по "Идее"
        //Идея звучала так
        //It's not possible to use custom elements without ES6 classes. That was a design decision necessary to achieve consensus at the January face-to-face meeting.
        //Everyone should remember that every browser that implements custom elements also implements ES6 class syntax, with super().
        //The features are designed to work together and there is no desire to make things work with ES5 syntax or with older browsers,
        //since the specification is made for newer browsers.
        //
        //https://github.com/whatwg/html/issues/1704
        //https://github.com/w3c/webcomponents/issues/587
        //
        // Но, ваши друзь�� придумали, как это обойти
        // Не спрашивайте как это работает... я сам до конца не понимаю ))))
        var componentConstructor = function(){
            var _ = Reflect.construct(HTMLElement, [], new.target);
            /*if (typeof(mixin) == "object" && mixin){
                for (var item in mixin){
                  if (mixin.hasOwnProperty(item)){
                      _[item] = mixin[item];
                  }
                }
            }*/
            return _;
        };

        componentConstructor.name = creator.name;

        if (typeof base == 'function' && base){
            if (!Element.prototype.isPrototypeOf(base.prototype)){
                Object.setPrototypeOf(base.prototype, HTMLElement.prototype);
            }
            // Inherit(creator, base, mixin)
            if (typeof(mixin) == "object" && mixin){
                /*if (typeof(mixin) == "object" && mixin){
                    for (var item in mixin){
                      if (mixin.hasOwnProperty(item)){
                          _[item] = mixin[item];
                      }
                    }
                }*/
                creator.prototype = mixin;
                mixin.constructor = base;
                mixin.__proto__ = base.prototype;
                componentConstructor.prototype = mixin;
                //Object.setPrototypeOf(mixin.prototype, );
            } else {
                creator.prototype = base.prototype;
                Object.setPrototypeOf(componentConstructor.prototype, base.prototype);
            }
            //Object.setPrototypeOf(componentConstructor, base);
        } else {
            if (typeof(base) == "object" && base){
                mixin = base;
            }
            if (typeof(mixin) == "object" && mixin){
                /*if (typeof(mixin) == "object" && mixin){
                    for (var item in mixin){
                      if (mixin.hasOwnProperty(item)){
                          _[item] = mixin[item];
                      }
                    }
                }*/
                mixin.__defineGetter__("classType", () => {return creator.name})
                creator.prototype = mixin;
                Object.setPrototypeOf(mixin, HTMLElement.prototype);
                //mixin.constructor = creator;
                //mixin.classType = creator.name;
                //Object.setPrototypeOf(componentConstructor.prototype, mixin);
                //Object.setPrototypeOf(mixin.prototype, );
                componentConstructor.prototype = mixin;
                Object.setPrototypeOf(componentConstructor, mixin);
            } else {
                Object.setPrototypeOf(componentConstructor, HTMLElement);
            }
        }
        componentConstructor.prototype._base = componentConstructor.prototype.constructor;
        //Object.setPrototypeOf(componentConstructor.prototype, creator.prototype);
        //Object.setPrototypeOf(componentConstructor.prototype, HTMLElement.prototype);


        //var result = Inherit(componentConstructor, HTMLElement, mixin);

        componentConstructor.prototype.connectedCallback = function() {
            if (!this.__uiInitialized) {
                if (this._creationContext){
                    creator.call(this, this._creationContext);
                }else {
                    creator.call(this, this.getContext());
                }
                //this._domContext = this;
                this.__uiInitialized = true;
            }
        };

        //MyIconProto.prototype = HTMLElement.prototype;

        //регистрируем новый элемент в браузере
        //DEPRECATED
        /*document.registerElement("font-icon", {
            prototype: MyIconProto
        });*/

        //регистрируем новый элемент в браузере
        if (extendValue){
            customElements.define(selector, componentConstructor, extendValue);
        } else {
            customElements.define(selector, componentConstructor);
        }

        return componentConstructor;
    }

    ui.MapToContext = {
        Condition: "ui-processing",
        id : "ui-map-to-context",
        Selector : "[mapTo]:not(.jasp-processed-ui-map-to-context)",
        Process : function(element){
            //debugger;
            if (element.getAttribute("mapTo") && element.getContext()){
                element.getContext()[element.getAttribute("mapTo")] = element;
            }
            return true;
        }
    };


    C.Add(ui.MapToContext);

    WS.DOMload(ui.Init);
}
