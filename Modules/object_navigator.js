/* Created by Semchenkov Alexander aka MiЯRoR aka Azzoo
   Date Created: 30-11-2018
   License: GPLv3 */
   
AbstractNavigator = function(data){
    if (!data) data = {};
    this.store = data;
};

Inherit(AbstractNavigator, EventEmitter, {
    followFirst : function(dataObj, selector){
        if (!selector) return;
        if (typeof selector == "string") {
            selector = new Selector(selector);
        }
        if (selector.isRoot){
            if (selector.id){
                if (this.data[selector.id]){
                    
                } else {
                    return;
                }
            }
        } else {
            
        }
    }
});


//module.exports = AbstractNavigator;