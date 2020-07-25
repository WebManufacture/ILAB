Widgets = M.GetModuleEndsUrl("ui/widgets.htm");

Widgets.Modules = {};

Widgets.Init = function() {
	M.all(".widget-module:not(.inprogress):not(.processed)").each(function(widgetModule){
		Widgets.ProcessWidgetModule(widgetModule);		
	});
	C.Add(Widgets.ParsingWidgetContext);
}


Widgets.ProcessWidgetModule = function(widgetModule){
	if (!widgetModule.id) widgetModule.id = "Widget" + Math.round(Math.random()*100000000000);	
	Widgets.Modules[widgetModule.id] = widgetModule;
	var selector = widgetModule.get("@for");
	var context = { Selector : selector + ".ui-widget", Condition : "ui-processing", Process: Widgets.ProcessWidget, WidgetModule : widgetModule, ParentModule : widgetModule.get("^.module")};	
	C.Add(context)
	widgetModule.add(".processed")
	return true;
}

Widgets.ProcessWidget = function(element, context) {
	var wm = context.WidgetModule;
	var pm = context.ParentModule;
	element.innerHTML = wm.innerHTML;
	C.Process(element, 'ui-processing');
	if (pm.evaledScripts && pm.evaledScripts.length > 0){
		var obj = EvalInContext(pm.evaledScripts[0], context.WidgetModule);
		if (typeof obj == 'object'){
			Extend(element, obj);
		}
		if (typeof obj == 'function'){
			if (obj.prototype){
				Extend(element, obj.prototype);
			}
			obj = obj.call(element);
		}
		
	}
	if (element.init){
		element.init();
	}
};

Widgets.ParsingWidgetContext = { Selector: ".widget-module:not(.inprogress):not(.processed)", Condition: "module-parsing", Process: Widgets.ProcessWidgetModule };

//Contexts.Add(Widgets.Context);

Widgets.Init();