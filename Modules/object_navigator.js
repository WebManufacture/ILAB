/* Created by Semchenkov Alexander aka MiЯRoR aka Azzoo
   Date Created: 25-07-2019
   License: GPLv3 */

//Структура, Навигатор, Контекст

var Selector = useModule('selectors');
function Navigator(structure) {
    this.root = structure ? structure : { "__" : [] };
    this.initStructure();
    this.timeout = 5000;
}

Inherit(Navigator, {
    initStructure: function(){

    },

    go: function(selector, context, callback){
        var counter = 0;
        selector = new Selector(selector);
        if (!callback.direction) callback.direction = "all";
        var symbol = "";
        switch (callback.direction) {
            case 'forward':
                symbol = ">";
                break;
            case 'backward':
                symbol = "<";
                break;
            case 'exact':
                symbol = "=";
                break;
            default:
                symbol = "*"

        }
        if (selector.isRoot){
            counter += this.next(this.root, false, selector, context, callback, symbol + "root", "root", 0, ">0", "/");
        } else {
            counter += this.next(this.root, true, selector, context, callback, symbol + "root", "root", 0, ">0", "");
        }
        return counter;
    },

    forward: function(selector, context, callback){
        callback.direction = "forward";
        return this.go(selector, context, callback);
    },


    exact: function(selector, context, callback){
        callback.direction = "exact";
        return this.go(selector, context, callback);
    },

    backward: function(selector, context, callback){
        callback.direction = "backward";
        return this.go(selector, context, callback);
    },

    next : function(object, deepSearch, selector, context, callback, path, relation, level, treeNo, rootPath){
        var counter = 0;
        if (object == undefined) return 0;
        if (Array.isArray(object)){
            for (var i = 0; i <= object.length; i++){
                counter += this.next(object[i], deepSearch, selector, context, callback, path + "["+ i + "]", relation + "["+ i + "]", level, treeNo + "[" + i + "]", rootPath + "["+ i + "]");
            }
        } else {
            var result = selector.is(object);
            if (result) {
                counter++;
                rootPath += " " + result;
                if (callback.direction == "all" || callback.direction == "forward") callback({
                    direction: 'forward',
                    selector: selector,
                    object: object,
                    relation: relation,
                    level: level,
                    path: path,
                    rootPath: rootPath,
                    node: result,
                    tree: treeNo,
                });
                if (!selector.next && !selector.follow){
                    if (callback.direction == "all" || callback.direction == "exact") callback({
                        direction: 'exact',
                        selector: selector,
                        object: object,
                        relation: relation,
                        level: level,
                        path: path,
                        rootPath: rootPath,
                        node: result,
                        tree: treeNo,
                    });
                } else {
                    counter += this._checkInternals(object, selector, context, callback, path, relation, level, treeNo, rootPath);
                }
            }
            if (typeof object == "object" && deepSearch) {
                var no = 0;
                for (var item in object) {
                    if (object.hasOwnProperty(item)){
                        counter += this.next(object[item], true, selector, context, callback, path+"." + item, item, level+1, treeNo + "-" + (level+1) + "(" + (no++) + ")", rootPath);
                    }
                }
            }
            if (result){
                if (callback.direction == "all" || callback.direction == "backward") callback({
                    direction: 'backward',
                    selector: selector,
                    object: object,
                    relation: relation,
                    level: level,
                    path: path,
                    rootPath: rootPath,
                    node: result,
                    tree: treeNo,
                });
            }
        }
        return counter;
    },

    _checkInternals: function (object, selector, context, callback, path, relation, level, treeNo, rootPath) {
        var counter = 0;
        if (object == undefined) return 0;
        if (typeof object == "object") {
            if (Array.isArray(object)){
                for (var i = 0; i <= object.length; i++){
                    counter += this._checkInternals(object[i], selector, context, callback, path, relation + "["+ i + "]", level, treeNo + "[" + i + "]", rootPath + "[" + i + "]")
                }
            } else {
                var no = 0;
                if (selector.next) {
                    for (var item in object) {
                        if (object.hasOwnProperty(item)){
                            counter += this.next(object[item], false, selector.next, context, callback, path+"."+item, item, level + 1, treeNo + "-" + (level+1) + "(" + (no++) + ")", rootPath);
                        }
                    }
                }
                if (selector.follow) {
                    for (var item in object) {
                        if (object.hasOwnProperty(item)){
                            counter += this.next(object[item], true, selector.follow, context, callback, path+"."+item, item, level + 1, treeNo + "-" + (level+1) + "(" + (no++) + ")", rootPath);
                        }
                    }
                }
            }
        }
        return counter;
    }
});


module.exports = Navigator;



//module.exports = AbstractNavigator;
