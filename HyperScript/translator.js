level0 = function(owner, text){
    var start = text.lastIndexOf("{");
    if (start >= 0){
        var end = text.indexOf("}", start);
        if (end >= 0){
            var part1 = text.slice(0, start);
            var part2 = text.slice(start + 1,end);
            var part3 = text.slice(end + 1);
            owner.push(part2);
            text = part1 + "(block" + (owner.length-1) + ")" + part3;
            return level0(owner, text);
        }
        else{
            throw "no end found";
        }
    }
    owner.push(text);
    return text;
}

function Block(name){
    var arr = [];
    arr.name = name;
    arr.indexes = {};
    arr.names = {};
    arr.type = "block";
    arr.addIndex = function(name, index){
        arr.indexes[name] = index;
        arr.names[index] = name;
    }
    arr.toString = function(){
        var s = "Block(" + this.length + "){\n";
        for (var i = 0; i < this.length; i++){
            if (arr.names[i])
                s += arr.names[i] + " = ";
            var value = JSON.stringify(this[i]);
            if (value.length > 100) value = value.slice(0, 100) + "... ,";
            s += value + "\n";
        }
        s += "}";
    }
    return arr;
}

parseExpressions = function(owner, text, motherBlock){
    text = parseSelectors(owner, text);
    var blockRegex = /\(block(\d+)\)/ig;
    var childBlocks = [];
    while (match = blockRegex.exec(text)){
        if (match[1]){
            var blockId = parseInt(match[1]);
            var block = Block(blockId);
            childBlocks.push(level1(owner, owner[blockId], block));
        }
    }
    motherBlock.push({ code : text, type: "expression", childs: childBlocks });
}

parseSelectors = function(owner, code){
    var selectorRegex = /(([_$A-Za-z0-9]+)?(#[_$A-Za-z0-9]+)?(\.[_$A-Za-z0-9]+)*)\(block(\d+)\)/ig;
    while (match = selectorRegex.exec(code)){
        if (match[1]){
            var part1 = code.slice(0, match.index);
            var part2 = code.slice(match.index + match[1].length);
            owner.push(
                {
                    type: "selector", 
                    code: match[1],
                    block: match[3],
                    id: owner.length
                });
            code = part1 + "(selector" + (owner.length-1) + ")" + part2;
        }
    }
    return code;
}

level1 = function(owner, code, block){
    var parts = code.split('\n');
    for (var i = 0; i < parts.length; i++){
        var line = parts[i];
        line = line.trim();
        if (!line) continue;
        
        var parts2 = line.split(';');
        //if (parts2.length > 1 && parts2[parts2.length-1].indexOf("//") == 0) parts2[parts2.length-1] = { type: "comment", text: parts2[parts2.length-1]};
        for (var j = 0; j < parts2.length; j++){
            if (typeof parts2[j] == "object"){
                block.push(parts2[j]);
                continue;
            }
            line = (parts2[j] + "").trim();
            if (!line) continue;
            parseExpressions(owner, line, block);
        }
    }
    return block;
}

debugItems = function(block, prefix){
    if (!prefix) prefix = ' ';
    if (block.type == "block"){
        console.log(prefix + "--" + block.name);
        for (var i = 0; i < block.length; i++){
            var items = block[i];
            debugItems(items, "  |" + prefix);
        }
    }
    if (block.type == "expression"){
        console.log(prefix + " " + block.code);
        if (items.childs){
            for (var k = 0; k < items.childs.length; k++) {
                debugItems(items.childs[k], "  |" + prefix);
            }
        }
    }
}

translator = function(code){
    var owner = [];
    code = "{" + code + "}\n";
    code = code.replace(/\}\s*\n/ig, "};");
    var rootObj = level0(owner, code);
    var rootObjIndex = owner.length - 1;
    var rootBlock = Block("root");
    var rootObj = level1(owner, rootObj, rootBlock);
    /*
    for (var i = 0; i < owner.length; i++){
        level1(owner, i, owner[i]);
    }*/
    //var items = level2(owner, rootObj);
    console.log(owner);
    console.log(rootObj);
    debugItems(rootObj);   
}

translatorOld = function(code){
    var regex = /(([_$A-Za-z0-9]+)?(#[_$A-Za-z0-9]+)?(\.[_$A-Za-z0-9]+)*[_$A-Za-z0-9]){/ig;
    code = " " + code;
    //code = code.replace(/}/ig, "})\n");
    //code = code.replace(regex, "\n_hobj.call(this, new Selector('$1'), function(){");
    code = code.replace(regex, "_default(this, '$1', '$2', '$3', '$4').accept = function(context){ \n ");
    
    /*var regex = /function\s+([_$A-Za-z0-9]\w+)?\s{0,}\(/ig;
    code = code.replace(regex, "function $1('$2$3', function(){");*/
 //   ;
   /* var match;
    while (match = regex.exec(code)){
        if (match[0] == "{" || match[1] == "") continue;
        console.log(match);
    }*/
    //return "return _root(function(){" + code + "\n})//root";
    var regex = /(([_$A-Za-z0-9]+):){/ig;
    code = code.replace(regex, "window['$2'] = function(selector){\n ");
    code = code.replace(/new Selector\(''\)/ig, "null");
    return " " + code + "\n";
}

function rootObj(selector){
    Selector.call(this, selector.source);
    //return new Promise(function(){return param});
}

function _default(thisParam, selector){
    selector = new Selector(selector);
    if (!thisParam.context) thisParam.context = [];
    var tag = selector.type ? selector.type : "rootObj";
    var context = new window[tag](selector);
    thisParam.context.push(context);
    return {
        get accept(){
            return this.result;
        },
        
        set accept(value){
            if (typeof value == "function"){
                this.result = value.call(context, thisParam);
            }
            return this.result;
        }
    }
}
