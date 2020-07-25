(function(){
    var ns = ui.register("LoadingPanel", function (options, elem) {
        if (!options) options = {};
        var text = "Loading...";
        if (typeof(options) == "string"){
            text = options;
            options = {
                text: text
            };
            if (typeof(elem) == "object" && elem.NodeType == 1){
                options.dom = elem;
            }
        }
        this.text = text;
        this._super.call(this, options);
        this.render(options.dom);
    }, {
        _createDOM : function(elem, id){
            if (!id) id = "LoadingPanel" + Math.random().toString().replace("0.", "");
            elem = elem.add(ns.dom.clone());
            elem.id = id;
            var me = this;
            elem.map = function(obj){
                me.map(obj);
            }
            return elem;
        },
        
        render : function(elem, id){
            if (!this.dom){
                if (!elem){
                    elem = WS.Body;
                } 
                elem = this._createDOM(elem, id);
                this.dom = elem;
                this.id = elem.id;
            }
            else{
                if (this.dom.parentNode != elem){
                    elem.add(this.dom);
                }
            }
            this._base.render.call(this,this.dom);
            this.map(this.text);
        },
        
        map : function(obj){
            elem = this.dom;
            if (typeof obj == "string"){
                elem.get(".ui-loading-panel-text").set(obj);
            }
            if (typeof obj == "Object"){
                if (obj.text){
                    elem.get(".ui-loading-panel-text").set(obj.text);
                }
                else{
                    elem.get(".ui-loading-panel-text").clear();
                }
            }
        }
    });
    
    ns.module = M.GetModuleByUrl("%ui%/LoadingPanel.htm");
    
    ns.dom = ns.module.get(".prototype");
})();