global = this;
(function (modules) {

    // Bundle allows the run-time to extract already-loaded modules from the
    // boot bundle.
    var bundle = {};
    var main;

    // Unpack module tuples into module objects.
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        module = modules[i] = new Module(
            module[0],
            module[1],
            module[2],
            module[3],
            module[4]
        );
        bundle[module.filename] = module;
    }

    function Module(id, dirname, basename, dependencies, factory) {
        this.id = id;
        this.dirname = dirname;
        this.filename = dirname + "/" + basename;
        // Dependency map and factory are used to instantiate bundled modules.
        this.dependencies = dependencies;
        this.factory = factory;
    }

    Module.prototype._require = function () {
        var module = this;
        if (module.exports === void 0) {
            module.exports = {};
            var require = function (id) {
                var index = module.dependencies[id];
                var dependency = modules[index];
                if (!dependency)
                    throw new Error("Bundle is missing a dependency: " + id);
                return dependency._require();
            };
            require.main = main;
            module.exports = module.factory(
                require,
                module.exports,
                module,
                module.filename,
                module.dirname
            ) || module.exports;
        }
        return module.exports;
    };

    // Communicate the bundle to all bundled modules
    Module.prototype.modules = bundle;

    return function require(filename) {
        main = bundle[filename];
        main._require();
    }
})([["document.js","inkblot","document.js",{},function (require, exports, module, __filename, __dirname){

// inkblot/document.js
// -------------------

'use strict';

module.exports = Document;

function Document(element) {
    var self = this;
    this.element = element;
    this.engine = null;
    this.carry = '';
    this.cursor = null;
    this.next = null;
    this.options = null;
    this.p = false;
    this.br = false;
    this.onclick = onclick;
    function onclick(event) {
        self.answer(event.target.number);
    }
    Object.seal(this);
}

Document.prototype.write = function write(lift, text, drop) {
    var document = this.element.ownerDocument;
    if (this.p) {
        this.cursor = document.createElement("p");
        this.element.insertBefore(this.cursor, this.options);
        this.p = false;
        this.br = false;
    }
    if (this.br) {
        this.cursor.appendChild(document.createElement("br"));
        this.br = false;
    }
    this.cursor.appendChild(document.createTextNode((this.carry || lift) + text));
    this.carry = drop;
};

Document.prototype.break = function _break() {
    this.br = true;
};

Document.prototype.paragraph = function paragraph() {
    this.p = true;
};

Document.prototype.option = function option(number, label) {
    var document = this.element.ownerDocument;
    var tr = document.createElement("tr");
    this.options.appendChild(tr);
    var th = document.createElement("th");
    tr.appendChild(th);
    th.innerText = number + '.';
    var td = document.createElement("td");
    td.innerText = label;
    td.number = number;
    td.onclick = this.onclick;
    tr.appendChild(td);
};

Document.prototype.flush = function flush() {
    // No-op (for console only)
};

Document.prototype.pardon = function pardon() {
    this.clear();
    // No-op (for console only)
};

Document.prototype.display = function display() {
    // No-op (for console only)
};

Document.prototype.clear = function clear() {
    var document = this.element.ownerDocument;
    this.element.innerHTML = "";
    this.options = document.createElement("table");
    this.element.appendChild(this.options);
    this.cursor = null;
    this.br = false;
    this.p = true;
    this.carry = '';
};

Document.prototype.question = function question() {
};

Document.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Document.prototype.close = function close() {
};

}],["engine.js","inkblot","engine.js",{"./hello.json":3},function (require, exports, module, __filename, __dirname){

// inkblot/engine.js
// -----------------

'use strict';

module.exports = Engine;

var debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

function Engine(story, start, render, interlocutor) {
    var self = this;
    this.story = story;
    this.options = [];
    this.keywords = {};
    this.variables = {};
    this.top = new Global();
    this.stack = [this.top];
    this.label = null;
    this.instruction = {type: 'goto', next: start || 'start'};
    this.render = render;
    this.interlocutor = interlocutor;
    this.interlocutor.engine = this;
    this.debug = debug;
    Object.seal(this);
}

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        if (this.debug) {
            console.log(JSON.stringify(this.instruction));
        }
        if (!this['$' + this.instruction.type]) {
            throw new Error('Unexpected instruction type: ' + this.instruction.type);
        }
        _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
};

Engine.prototype.print = function print(text) {
    // Implicitly prompt if there are pending options before resuming the
    // narrative.
    if (this.options.length) {
        this.prompt();
        return false;
    }
    this.render.write(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
};

Engine.prototype.$text = function text() {
    return this.print(this.instruction.text);
};

Engine.prototype.$print = function print() {
    return this.print('' + this.read());
};

Engine.prototype.$break = function $break() {
    this.render.break();
    return this.goto(this.instruction.next);
};

Engine.prototype.$paragraph = function $paragraph() {
    this.render.paragraph();
    return this.goto(this.instruction.next);
};

Engine.prototype.$goto = function $goto() {
    return this.goto(this.instruction.next);
};

Engine.prototype.$call = function $call() {
    var routine = this.story[this.instruction.label];
    if (!routine) {
        throw new Error('no such routine ' + this.instruction.label);
    }
    this.top = new Frame(this.top, routine.locals, this.instruction.next);
    this.stack.push(this.top);
    if (this.debug) {
        console.log('PUSH', this.instruction.label, JSON.stringify(routine.locals), this.instruction.next);
    }
    return this.goto(this.instruction.branch);
};

Engine.prototype.$subroutine = function $subroutine() {
    // Subroutines exist as targets for labels as well as for reference to
    // locals in calls.
    return this.goto(this.instruction.next);
};

Engine.prototype.$option = function option() {
    this.options.push(this.instruction);
    for (var i = 0; i < this.instruction.keywords.length; i++) {
        var keyword = this.instruction.keywords[i];
        this.keywords[keyword] = this.instruction.branch;
    }
    return this.goto(this.instruction.next);
};

Engine.prototype.$inc = function inc() {
    this.write(this.read() + 1);
    return this.goto(this.instruction.next);
};

Engine.prototype.$set = function set() {
    this.write(this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$add = function add() {
    this.write(this.read() + this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$sub = function sub() {
    this.write(this.read() - this.instruction.value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$jz = function jz() {
    if (this.debug) {
        console.log('JZ', this.instruction.variable, this.read());
    }
    if (!this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$jnz = function jnz() {
    if (this.debug) {
        console.log('JNZ', this.instruction.variable, this.read());
    }
    if (this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$jlt = function jlt() {
    if (this.read() < this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jgt = function jgt() {
    if (this.read() > this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jge = function jge() {
    if (this.read() >= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$jle = function jle() {
    if (this.read() <= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

Engine.prototype.$switch = function _switch() {
    var branches = this.instruction.branches;
    var value;
    if (this.instruction.mode === 'rand') {
        value = Math.floor(Math.random() * branches.length);
    } else {
        value = this.read();
        if (this.instruction.value !== 0) {
            this.write(value + this.instruction.value);
        }
    }
    if (this.instruction.mode === 'loop') {
        value = value % branches.length;
    } else if (this.instruction.mode === 'hash') {
        value = hash(value) % branches.length;
    }
    var next = branches[Math.min(value, branches.length - 1)];
    return this.goto(next);
};

function hash(x) {
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x) * 0x45d9f3b;
    x = ((x >> 16) ^ x);
    return x >>> 0;
}

Engine.prototype.$prompt = function prompt() {
    this.prompt();
    return false;
};

Engine.prototype.goto = function _goto(name, fresh) {
    if (this.debug) {
        if (name === null) {
            console.log('STACK', this.stack.map(getNext), 'OPTIONS', this.options.length);
        }
    }
    while (name === null && this.stack.length > 1 && this.options.length === 0) {
        this.top = this.stack.pop();
        name = this.top.next;
        if (this.debug) {
            console.log('POP', name, this.stack.map(getNext));
        }
    }
    if (name === null) {
        if (this.options.length && !fresh) {
            this.prompt();
            return false;
        } else {
            this.display();
            this.render.break();
            this.interlocutor.close();
            return false;
        }
    }
    if (this.debug) {
        console.log('GO TO', name);
    }
    var next = this.story[name];
    if (!next) {
        throw new Error('Story missing knot for name: ' + name);
    }
    this.label = name;
    this.instruction = next;
    return true;
};

function getNext(frame) {
    return frame.next;
}

Engine.prototype.read = function read() {
    var variable = this.instruction.variable;
    if (this.variables[variable] == undefined) {
        this.variables[variable] = 0;
    }
    return this.variables[variable];
};

Engine.prototype.write = function write(value) {
    var variable = this.instruction.variable;
    this.variables[variable] = value;
};

Engine.prototype.answer = function answer(text) {
    this.render.flush();
    if (text === 'quit') {
        this.interlocutor.close();
        return;
    }
    var n = +text;
    if (n >= 1 && n <= this.options.length) {
        if (this.goto(this.options[n - 1].branch, true)) {
            this.flush();
            this.continue();
        }
    } else if (this.keywords[text]) {
        if (this.goto(this.keywords[text], true)) {
            this.flush();
            this.continue();
        }
    } else {
        this.render.pardon();
        this.prompt();
    }
};

Engine.prototype.display = function display() {
    this.render.display();
};

function getLength(array) {
    return array.length;
}

Engine.prototype.prompt = function prompt() {
    this.display();
    for (var i = 0; i < this.options.length; i++) {
        var option = this.options[i];
        this.render.option(i + 1, option.label);
    }
    this.interlocutor.question();
};

Engine.prototype.flush = function flush() {
    this.options.length = 0;
    this.keywords = {};
    this.render.clear();
};

function Global() {
    this.scope = Object.create(null);
    this.next = null;
}

Global.prototype.get = function get(name) {
    return this.scope[name] || 0;
};

Global.prototype.set = function set(name, value) {
    this.scope[name] = value;
};

function Frame(parent, locals, next) {
    this.locals = locals;
    this.scope = Object.create(null);
    for (var i = 0; i < locals.length; i++) {
        this.scope[locals[i]] = 0;
    }
    this.parent = parent;
    this.next = next;
}

Frame.prototype.get = function get(name) {
    if (this.locals.indexOf(name) >= 0) {
        return this.scope[name];
    }
    return this.parent.get(name);
};

Frame.prototype.set = function set(name, value) {
    if (this.locals.indexOf(name) >= 0) {
        this.scope[name] = value;
    }
    return this.parent.set(name, value);
};


function main() {
    var story = require('./hello.json');
    var engine = new Engine(story);
    engine.continue();
}

if (require.main === module) {
    main();
}

}],["examples/archery.json","inkblot/examples","archery.json",{},function (require, exports, module, __filename, __dirname){

// inkblot/examples/archery.json
// -----------------------------

module.exports = {
    "start": {
        "type": "set",
        "variable": "gold",
        "value": 2,
        "next": "start.1"
    },
    "start.1": {
        "type": "set",
        "variable": "arrow",
        "value": 0,
        "next": "start.2"
    },
    "start.2": {
        "type": "set",
        "variable": "hit",
        "value": 0,
        "next": "start.3"
    },
    "start.3": {
        "type": "text",
        "text": "You enter the fletcher’s shop. The fletcher beckons, “There are arrows for sale and a range out back to try your skill and fortune. For each score hit, you win more gold!”",
        "lift": "",
        "drop": " ",
        "next": "start.4"
    },
    "start.4": {
        "type": "paragraph",
        "next": "shop"
    },
    "shop": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "shop.1"
    },
    "shop.1": {
        "type": "switch",
        "variable": "arrow",
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.1.1",
            "shop.1.2",
            "shop.1.3"
        ]
    },
    "shop.1.1": {
        "type": "text",
        "text": "no arrows",
        "lift": "",
        "drop": "",
        "next": "shop.2"
    },
    "shop.1.2": {
        "type": "text",
        "text": "an arrow",
        "lift": "",
        "drop": "",
        "next": "shop.2"
    },
    "shop.1.3": {
        "type": "print",
        "variable": "arrow",
        "next": "shop.1.3.1"
    },
    "shop.1.3.1": {
        "type": "text",
        "text": "arrows",
        "lift": " ",
        "drop": "",
        "next": "shop.2"
    },
    "shop.2": {
        "type": "switch",
        "variable": "arrow",
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.2.1",
            "shop.2.2"
        ]
    },
    "shop.2.1": {
        "type": "switch",
        "variable": "gold",
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.2.1.0.1",
            "shop.2.1.0.2"
        ]
    },
    "shop.2.1.0.1": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "shop.3"
    },
    "shop.2.1.0.2": {
        "type": "text",
        "text": "but",
        "lift": " ",
        "drop": " ",
        "next": "shop.3"
    },
    "shop.2.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "shop.3"
    },
    "shop.3": {
        "type": "call",
        "label": "gold",
        "branch": "gold",
        "next": "shop.4"
    },
    "shop.4": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "shop.5"
    },
    "shop.5": {
        "type": "jnz",
        "variable": "gold",
        "branch": "shop.8",
        "next": "shop.6"
    },
    "shop.6": {
        "type": "jnz",
        "variable": "arrow",
        "branch": "shop.8",
        "next": "exit"
    },
    "shop.8": {
        "type": "jz",
        "variable": "gold",
        "branch": "shop.10",
        "next": "shop.9"
    },
    "shop.9": {
        "type": "option",
        "label": "Buy 3 arrows for a gold piece.",
        "keywords": [],
        "branch": "shop.9.1",
        "next": "shop.10"
    },
    "shop.9.1": {
        "type": "text",
        "text": "You b",
        "lift": "",
        "drop": "",
        "next": "shop.9.2"
    },
    "shop.9.2": {
        "type": "text",
        "text": "uy 3 arrows for a gold piece.",
        "lift": "",
        "drop": " ",
        "next": "shop.9.3"
    },
    "shop.9.3": {
        "type": "sub",
        "variable": "gold",
        "value": 1,
        "next": "shop.9.4"
    },
    "shop.9.4": {
        "type": "add",
        "variable": "arrow",
        "value": 3,
        "next": "shop"
    },
    "shop.10": {
        "type": "jge",
        "variable": "arrow",
        "value": 4,
        "branch": "shop.12",
        "next": "shop.11"
    },
    "shop.11": {
        "type": "option",
        "label": "Sell 4 arrows for a gold piece.",
        "keywords": [],
        "branch": "shop.11.1",
        "next": "shop.12"
    },
    "shop.11.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "shop.11.2"
    },
    "shop.11.2": {
        "type": "text",
        "text": "ell 4 arrows for a gold piece.",
        "lift": "",
        "drop": " ",
        "next": "shop.11.3"
    },
    "shop.11.3": {
        "type": "add",
        "variable": "gold",
        "value": 1,
        "next": "shop.11.4"
    },
    "shop.11.4": {
        "type": "sub",
        "variable": "arrow",
        "value": 4,
        "next": "shop"
    },
    "shop.12": {
        "type": "option",
        "label": "Visit the archery range.",
        "keywords": [],
        "branch": "shop.12.1",
        "next": "shop.13"
    },
    "shop.12.1": {
        "type": "text",
        "text": "You walk through the door to",
        "lift": "",
        "drop": "",
        "next": "shop.12.2"
    },
    "shop.12.2": {
        "type": "text",
        "text": "the archery range.",
        "lift": " ",
        "drop": " ",
        "next": "range"
    },
    "shop.13": {
        "type": "option",
        "label": "Leave the store",
        "keywords": [],
        "branch": "exit",
        "next": "range"
    },
    "range": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "range.1"
    },
    "range.1": {
        "type": "switch",
        "variable": "arrow",
        "value": 0,
        "mode": "walk",
        "branches": [
            "range.1.1",
            "range.1.2",
            "range.1.3"
        ]
    },
    "range.1.1": {
        "type": "text",
        "text": "no arrows",
        "lift": "",
        "drop": "",
        "next": "range.2"
    },
    "range.1.2": {
        "type": "text",
        "text": "an arrow",
        "lift": "",
        "drop": "",
        "next": "range.2"
    },
    "range.1.3": {
        "type": "print",
        "variable": "arrow",
        "next": "range.1.3.1"
    },
    "range.1.3.1": {
        "type": "text",
        "text": "arrows",
        "lift": " ",
        "drop": "",
        "next": "range.2"
    },
    "range.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "range.3"
    },
    "range.3": {
        "type": "jz",
        "variable": "arrow",
        "branch": "range.5",
        "next": "range.4"
    },
    "range.4": {
        "type": "option",
        "label": "Shoot an arrow",
        "keywords": [],
        "branch": "range.4.1",
        "next": "range.5"
    },
    "range.4.1": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "range.4.2"
    },
    "range.4.2": {
        "type": "text",
        "text": "hoot an arrow",
        "lift": "",
        "drop": " ",
        "next": "range.4.3"
    },
    "range.4.3": {
        "type": "sub",
        "variable": "arrow",
        "value": 1,
        "next": "range.4.4"
    },
    "range.4.4": {
        "type": "switch",
        "variable": "range.4.4",
        "value": 0,
        "mode": "rand",
        "branches": [
            "range.4.4.1",
            "range.4.4.2",
            "range.4.4.3"
        ]
    },
    "range.4.4.1": {
        "type": "text",
        "text": "and hit the target, winning 1 gold piece!",
        "lift": "",
        "drop": " ",
        "next": "range.4.4.1.1"
    },
    "range.4.4.1.1": {
        "type": "add",
        "variable": "gold",
        "value": 1,
        "next": "range.4.4.1.2"
    },
    "range.4.4.1.2": {
        "type": "add",
        "variable": "hit",
        "value": 1,
        "next": "range"
    },
    "range.4.4.2": {
        "type": "goto",
        "next": "range.4.5"
    },
    "range.4.4.3": {
        "type": "goto",
        "next": "range.4.5"
    },
    "range.4.5": {
        "type": "text",
        "text": "and miss.",
        "lift": " ",
        "drop": " ",
        "next": "range"
    },
    "range.5": {
        "type": "option",
        "label": "Return to the archery shop.",
        "keywords": [],
        "branch": "range.5.1",
        "next": "exit"
    },
    "range.5.1": {
        "type": "text",
        "text": "You r",
        "lift": "",
        "drop": "",
        "next": "range.5.2"
    },
    "range.5.2": {
        "type": "text",
        "text": "eturn to the archery shop.",
        "lift": "",
        "drop": " ",
        "next": "shop"
    },
    "gold": {
        "type": "subroutine",
        "locals": [],
        "next": "gold.1"
    },
    "gold.1": {
        "type": "switch",
        "variable": "gold",
        "value": 0,
        "mode": "walk",
        "branches": [
            "gold.1.1",
            "gold.1.2",
            "gold.1.3"
        ]
    },
    "gold.1.1": {
        "type": "text",
        "text": "no gold",
        "lift": "",
        "drop": "",
        "next": null
    },
    "gold.1.2": {
        "type": "text",
        "text": "a gold piece",
        "lift": "",
        "drop": "",
        "next": null
    },
    "gold.1.3": {
        "type": "print",
        "variable": "gold",
        "next": "gold.1.3.1"
    },
    "gold.1.3.1": {
        "type": "text",
        "text": "gold",
        "lift": " ",
        "drop": "",
        "next": null
    },
    "exit": {
        "type": "text",
        "text": "You depart the store through the back door with",
        "lift": " ",
        "drop": " ",
        "next": "exit.1"
    },
    "exit.1": {
        "type": "call",
        "label": "gold",
        "branch": "gold",
        "next": "exit.2"
    },
    "exit.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "exit.3"
    },
    "exit.3": {
        "type": "jz",
        "variable": "hit",
        "branch": null,
        "next": "exit.4"
    },
    "exit.4": {
        "type": "text",
        "text": "All told, you scored",
        "lift": " ",
        "drop": " ",
        "next": "exit.5"
    },
    "exit.5": {
        "type": "print",
        "variable": "hit",
        "next": "exit.6"
    },
    "exit.6": {
        "type": "text",
        "text": "hit",
        "lift": " ",
        "drop": "",
        "next": "exit.7"
    },
    "exit.7": {
        "type": "switch",
        "variable": "hit",
        "value": 0,
        "mode": "walk",
        "branches": [
            "exit.7.1",
            "exit.7.2",
            "exit.7.3"
        ]
    },
    "exit.7.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "exit.8"
    },
    "exit.7.2": {
        "type": "goto",
        "next": "exit.8"
    },
    "exit.7.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "exit.8"
    },
    "exit.8": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": null
    }
}

}],["hello.json","inkblot","hello.json",{},function (require, exports, module, __filename, __dirname){

// inkblot/hello.json
// ------------------

module.exports = {
    "start": {
        "type": "text",
        "text": "Hello, \"World!\"",
        "next": "loop"
    },
    "loop": {
        "type": "option",
        "label": "Say, \"Hello\".",
        "keywords": [],
        "branch": "loop.0.1",
        "next": "loop.1"
    },
    "loop.0.1": {
        "type": "text",
        "text": "You say, \"Hello\".",
        "next": "loop.0.2"
    },
    "loop.0.2": {
        "type": "break",
        "next": "loop.0.3"
    },
    "loop.0.3": {
        "type": "text",
        "text": "You are too kind, hello again to you too.",
        "next": "loop"
    },
    "loop.1": {
        "type": "option",
        "label": "Say, \"Farewell.\"",
        "keywords": [],
        "branch": "loop.1.1",
        "next": "loop.2"
    },
    "loop.1.1": {
        "type": "text",
        "text": "You say, \"Farewell.\"",
        "next": "loop.3"
    },
    "loop.2": {
        "type": "prompt"
    },
    "loop.3": {
        "type": "break",
        "next": "loop.4"
    },
    "loop.4": {
        "type": "text",
        "text": "The End.",
        "next": null
    }
}

}],["index.js","inkblot","index.js",{"./engine":1,"./examples/archery.json":2,"./document":0},function (require, exports, module, __filename, __dirname){

// inkblot/index.js
// ----------------

'use strict';
var Engine = require('./engine');
var story = require('./examples/archery.json');
var Document = require('./document');
var doc = new Document(document.getElementById('body'));
var engine = new Engine(story, 'start', doc, doc);
doc.clear();
engine.continue();

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    }
};

}]])("inkblot/index.js")
