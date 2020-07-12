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

	ui.ComponentParsingContext = {
		Condition: "module-parsing",
		id : "uicomponents-parser",
		Selector : "inner-template",
		Process : function(protoElement){
			protoElement.add(".prototype");
			WS.Body.add(protoElement);
			var forSelector = protoElement.get("@for");
			var context = {
				Condition: "ui-processing",
				id : ("uicomponentForContext" + Math.random()).replace("0.",""),
				Selector : forSelector + ":not(.initialized)",
				Process : function(element){
					var title = protoElement.get("@title");
					if (title){
						element.add("@title", title);
					}
					element.innerHTML = protoElement.innerHTML;
					C.Process(element, "ui-processing");
					return true;
				}
			};
			C.Add(context);
			return true;
		}
	};


	C.Add(ui.ComponentParsingContext);


	//<div class='action' on=":click" atype="class-toggle" for="#Item22" set=".invisible.showed">

	ui.UIActionContext = {
		Condition: "ui-processing",
		id : "uiaction",
		Selector : ".ui-action:not(.jasp-processed-uiaction)",
		Process : function(element){
			var asel = element.uiActionSelector = element.attr("for");
			var atype = element.uiActionType = element.attr("atype");
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
					if (this._is(aname)){
						this._del(aname);
					}
					else{
						this._add(aname)
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
				var aname = elem.attr("set");
				if (aname){
					var target = DOM._all(asel);
					target._add(aname);
				}
			};

	ui.UIActionHandlers["class-off"] =
		ui.UIActionHandlers["del"] =
			function(elem, atype, asel, aevent){
				var aname = elem.attr("set");
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
		ui.info("registered", "namespace " + namespace);
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
		ui.ShadowEventEmitter._super.apply(this, arguments);
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
	}

	Inherit(ui.ShadowEventEmitter, EventEmitter);

	ui.inherit = function(namespace, creator, mixin){
		creator.namespace = namespace;
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
		return Inherit(creator, ui.ShadowEventEmitter, mixin);
	}

	WS.DOMload(ui.Init);
}