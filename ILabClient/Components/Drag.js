if (!window.Drag){
	Drag = {dragObject : null};
	
	Drag.Init = function(text){
		WS.Body.addEventListener("dragdrop", Drag.BodyDrop);
		WS.Body.addEventListener("dragover", Drag.BodyOver);
	};
	
	Drag.BodyOver = function(event){
		event.preventDefault();
		return false;
	};
	
	Drag.BodyDrop = function(event){
		if (Check(Drag.dragObject))
		{
			Drag.dragObject.style.left = (event.clientX - Drag.startX) + "px";
			Drag.dragObject.style.top = (event.clientY - Drag.startY) + "px";
		}
		event.preventDefault();
		return false;
	}  ;  
	
	Drag.DragElementStart = function(event){
		var dt = event.dataTransfer;
		dt.setData("Node", this.outerHTML);
		dt.effectsAlloved = "all";
		var win = Drag.dragObject;
		if (this._is(".dragger")){
			win = this._get("^.draggable");  
		}
		if (win == null) win = Drag.dragObject = this; 
		var offset = win.getBoundingClientRect();
		Drag.startX = event.screenX - offset.left;
		Drag.startY = event.screenY - offset.top;
		dt.setDragImage(win, Drag.startX, Drag.startY);
		Drag.dragObject.cls("dragging");
		event.stopPropagation();
		return false;
	};
	
	Drag.DragElementEnd = function(event){
		this.rcs("dragging");
		Drag.dragObject.style.left = (event.screenX - Drag.startX) + "px";
		Drag.dragObject.style.top = (event.screenY - Drag.startY) + "px";
		Drag.dragObject = null;
		event.stopPropagation();
		return false;
	};
	
	
	Drag.MakeDraggable = function(element){
		element.attr("draggable", "true"); 
		element.cls("draggable");
		element.addEventListener("dragstart", Drag.DragElementStart);
		element.addEventListener("dragend", Drag.DragElementEnd);
	};
	
	Drag.dContext = { Selector: "[draggable='true']", Condition : "ui-processing", ".drag" : undefined}; 
	Drag.dContext.Process = function(element){
		Drag.MakeDraggable(element);
	};
	
	Drag.ddContext = { Selector: ".draggable", Condition : "ui-processing", ".drag" : undefined}; 
	Drag.ddContext.Process = function(element){
		Drag.MakeDraggable(element);
	};
	
	C.Add(Drag.dContext);
	
	Drag.rContext = { Selector: ".drop-receiver", Condition : "ui-processing", ".drag" : undefined}; 
	Drag.rContext.Process = function(element){
		Drag.MakeReceiver(element);
	};
	
	C.Add(Drag.rContext);
	
	WS.DOMload(Drag.Init);
}