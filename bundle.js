// @generated
/*eslint semi:[0], no-native-reassign:[0]*/
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
})([["describe.js","kni","describe.js",{},function (require, exports, module, __filename, __dirname){

// kni/describe.js
// ---------------

'use strict';

module.exports = describe;

function describe(node) {
    return types[node.type](node);
}

var types = {};

types.text = function text(node) {
    return node.text;
};

types.echo = function echo(node) {
    return S(node.expression);
};

types.opt = function opt(node) {
    return '(Q ' + node.question.join(' ') + ') (A ' + node.answer.join(' ') + ')';
};

types.goto = function goto(_node) {
    return '';
};

types.call = function call(node) {
    return node.label + '(' + node.args.map(S).join(' ') + ') esc ' + node.branch;
};

types.def = function def(node) {
    return '(' + node.locals.join(' ') + ')';
};

types.jump = function jump(node) {
    return node.branch + ' if ' + S(node.condition);
};

types.switch = function _switch(node) {
    var desc = '';
    if (node.variable) {
        desc += '(' + node.variable + '+' +  node.value + ') ' + S(node.expression);
    } else {
        desc += S(node.expression);
    }
    desc += ' (' + node.branches.join(' ') + ') W(' + node.weights.map(S).join(' ') + ')';
    return desc;
};

types.set = function set(node) {
    return node.variable + ' ' + S(node.expression);
};

types.move = function move(node) {
    return S(node.source) + ' -> ' + S(node.target);
};

types.cue = function cue(node) {
    return node.cue;
};

types.br = function br(_node) {
    return '';
};

types.par = function par(_node) {
    return '';
};

types.rule = function rule(_node) {
    return '';
};

types.startJoin = function startJoin(_node) {
    return '';
};

types.stopJoin = function stopJoin(_node) {
    return '';
};

types.delimit = function delimit(_node) {
    return '';
};

types.ask = function ask(_node) {
    return '';
};

types.read = function ask(node) {
    var label = node.variable;
    if (node.cue != null) {
        label += ' ' + node.cue;
    }
    return label;
};

function S(args) {
    if (args[0] === 'val' || args[0] === 'get') {
        return args[1];
    } else if (args[0] === 'var') {
        return '(' + args[0] + ' ' + V(args[1], args[2]) + ')';
    } else {
        return '(' + args[0] + ' ' + args.slice(1).map(S).join(' ') + ')';
    }
}

function V(source, target) {
    var r = '';
    for (var i = 0; i < target.length; i++) {
        r += source[i];
        r += '{' + S(target[i]) + '}';
    }
    r += source[i];
    return r;
}

}],["document.js","kni","document.js",{},function (require, exports, module, __filename, __dirname){

// kni/document.js
// ---------------

'use strict';

module.exports = Document;

function Document(element, createPage) {
    var self = this;
    this.document = element.ownerDocument;
    this.parent = element;
    this.frame = null;
    this.body = null;
    this.afterBody = null;
    this.engine = null;
    this.carry = '';
    this.cursor = null;
    this.cursorParent = null;
    this.afterCursor = null;
    this.next = null;
    this.optionIndex = 0;
    this.options = null;
    this.p = false;
    this.br = false;
    this.onclick = onclick;
    this.createPage = createPage || this.createPage;
    function onclick(event) {
        self.answer(event.target.number);
    }
    Object.seal(this);
}

Document.prototype.write = function write(lift, text, drop) {
    var document = this.document;
    lift = this.carry || lift;
    if (this.p) {
        this.cursor = document.createElement("p");
        this.cursorParent.insertBefore(this.cursor, this.afterCursor);
        this.p = false;
        this.br = false;
        lift = '';
    }
    if (this.br) {
        this.cursor.appendChild(document.createElement("br"));
        this.br = false;
        lift = '';
    }
    // TODO merge with prior text node
    this.cursor.appendChild(document.createTextNode(lift + text));
    this.carry = drop;
};

Document.prototype.break = function _break() {
    this.br = true;
};

Document.prototype.paragraph = function paragraph() {
    this.p = true;
};

Document.prototype.startOption = function startOption() {
    this.optionIndex++;
    var document = this.document;
    var tr = document.createElement("tr");
    this.options.appendChild(tr);
    var th = document.createElement("th");
    tr.appendChild(th);
    th.innerText = this.optionIndex + '.';
    var td = document.createElement("td");
    td.number = this.optionIndex;
    td.onclick = this.onclick;
    td.setAttribute("aria-role", "button");
    tr.appendChild(td);
    this.cursor = td;
    this.p = false;
    this.br = false;
    this.carry = '';
};

Document.prototype.stopOption = function stopOption() {
    this.p = false;
    this.br = false;
};

Document.prototype.flush = function flush() {
    // No-op (for console only)
};

Document.prototype.pardon = function pardon() {
    // No-op (for console only)
};

Document.prototype.display = function display() {
    this.frame.style.opacity = 0;
    this.frame.style.transform = 'translateX(2ex)';
    this.parent.appendChild(this.frame);

    // TODO not this
    var frame = this.frame;
    setTimeout(function () {
        frame.style.opacity = 1;
        frame.style.transform = 'translateX(0)';
    }, 10);
};

Document.prototype.clear = function clear() {
    if (this.frame) {
        this.frame.style.opacity = 0;
        this.frame.style.transform = 'translateX(-2ex)';
        this.frame.addEventListener("transitionend", this);
    }
    this.createPage(this.document, this);
    this.cursor = null;
    this.cursorParent = this.body;
    this.afterCursor = this.afterBody;
    this.br = false;
    this.p = true;
    this.carry = '';
    this.optionIndex = 0;
};

Document.prototype.createPage = function createPage(document) {
    this.frame = document.createElement("div");
    this.frame.classList.add("kni-frame");
    this.frame.style.opacity = 0;

    var A = document.createElement("div");
    A.classList.add("kni-frame-a");
    this.frame.appendChild(A);

    var B = document.createElement("div");
    B.classList.add("kni-frame-b");
    A.appendChild(B);

    var C = document.createElement("div");
    C.classList.add("kni-frame-c");
    B.appendChild(C);

    this.body = document.createElement("div");
    this.body.classList.add("kni-body");
    C.appendChild(this.body);

    this.options = document.createElement("table");
    this.body.appendChild(this.options);
    this.afterBody = this.options;
};

Document.prototype.handleEvent = function handleEvent(event) {
    if (event.target.parentNode === this.parent) {
        this.parent.removeChild(event.target);
    }
};

Document.prototype.ask = function ask(_cue) {
};

Document.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Document.prototype.close = function close() {
};

}],["engine.js","kni","engine.js",{"./evaluate":3,"./describe":0},function (require, exports, module, __filename, __dirname){

// kni/engine.js
// -------------

'use strict';

var evaluate = require('./evaluate');
var describe = require('./describe');

module.exports = Engine;

var debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

function Engine(args) {
    // istanbul ignore next
    this.story = args.story;
    this.labels = Object.keys(this.story);
    this.handler = args.handler;
    this.options = [];
    this.keywords = {};
    this.noOption = null;
    this.global = new Global(this.handler);
    this.top = this.global;
    // istanbul ignore next
    this.start = args.start || 'start';
    this.label = this.start;
    this.instruction = {type: 'goto', next: this.start};
    this.render = args.render;
    this.dialog = args.dialog;
    this.dialog.engine = this;
    // istanbul ignore next
    this.randomer = args.randomer || Math;
    this.debug = debug;
    this.waypoint = this.capture();
    Object.seal(this);
}

Engine.prototype.reset = function reset() {
    Engine.call(this, this);
    this.resume();
};

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        // istanbul ignore if
        if (this.debug) {
            console.log(this.label + ' ' +  this.instruction.type + ' ' + describe(this.instruction));
        }
        // istanbul ignore if
        if (this.instruction == null) {
            // TODO user error for non-console interaction.
            console.log('The label ' + JSON.stringify(this.label) + ' does not exist in this story');
            this.end();
            return;
        }
        // istanbul ignore if
        if (!this['$' + this.instruction.type]) {
            console.error('Unexpected instruction type: ' + this.instruction.type, this.instruction);
            this.resume();
        }
        _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
};

Engine.prototype.goto = function _goto(label) {
    while (this.top != null && (label == 'ESC' || label === 'RET')) {
        // istanbul ignore if
        if (this.debug) {
            console.log(label.toLowerCase());
        }
        if (this.top.stopOption) {
            this.render.stopOption();
        }
        if (label === 'ESC') {
            label = this.top.branch;
        } else {
            label = this.top.next;
        }
        this.top = this.top.parent;
    }

    if (label === 'RET') {
        return this.end();
    }

    var next = this.story[label];
    // istanbul ignore if
    if (!next) {
        console.error('Story missing label', label);
        return this.resume();
    }
    // istanbul ignore if
    if (!next) {
        console.error('Story missing instruction for label: ' + label);
        return this.resume();
    }
    if (this.handler && this.handler.goto) {
        this.handler.goto(label, next);
    }
    this.label = label;
    this.instruction = next;
    return true;
};

Engine.prototype.gothrough = function gothrough(sequence, next) {
    var prev = this.label;
    for (var i = sequence.length - 1; i >= 0; i--) {
        if (next !== 'RET') {
            this.top = new Frame(this.top, [], next, 'RET', prev);
        }
        prev = next;
        next = sequence[i];
    }
    return this.goto(next);
};

Engine.prototype.end = function end() {
    if (this.handler && this.handler.end) {
        this.handler.end(this);
    }
    this.display();
    this.dialog.close();
    return false;
};

Engine.prototype.ask = function ask() {
    if (this.options.length) {
        this.display();
        if (this.handler && this.handler.ask) {
            this.handler.ask(this);
        }
        this.dialog.ask();
    } else if (this.noOption != null) {
        var closure = this.noOption;
        var option = this.story[closure.label];
        this.top = closure.scope;
        var answer = option.answer;
        this.flush();
        this.gothrough(answer, 'RET');
        this.continue();
    } else {
        return this.goto('RET');
    }
};

Engine.prototype.read = function read() {
    this.display();
    if (this.handler && this.handler.ask) {
        this.handler.ask(this);
    }
    this.dialog.ask(this.instruction.cue);
};

Engine.prototype.answer = function answer(text) {
    if (this.handler && this.handler.answer) {
        this.handler.answer(text, this);
    }
    this.render.flush();
    if (this.instruction.type === 'read') {
        this.top.set(this.instruction.variable, text);
        this.render.clear();
        if (this.goto(this.instruction.next)) {
            this.continue();
        }
        return;
    }
    var choice = text - 1;
    if (choice >= 0 && choice < this.options.length) {
        return this.choice(this.options[choice]);
    } else if (this.keywords[text]) {
        return this.choice(this.keywords[text]);
    } else {
        this.render.pardon();
        this.ask();
    }
};

Engine.prototype.choice = function _choice(closure) {
    var option = this.story[closure.label];
    if (this.handler && this.handler.choice) {
        this.handler.choice(option, this);
    }
    this.render.clear();
    this.waypoint = this.capture(closure);
    if (this.handler && this.handler.waypoint) {
        this.handler.waypoint(this.waypoint, this);
    }
    // Resume in the option's closure scope.
    this.top = closure.scope;
    // There is no known case where gothrough would immediately exit for
    // lack of further instructions, so
    // istanbul ignore else
    if (this.gothrough(option.answer, 'RET')) {
        this.flush();
        this.continue();
    }
};

Engine.prototype.display = function display() {
    this.render.display();
};

Engine.prototype.flush = function flush() {
    this.options.length = 0;
    this.noOption = null;
    this.keywords = {};
};

Engine.prototype.write = function write(text) {
    this.render.write(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
};

// istanbul ignore next
Engine.prototype.capture = function capture(closure) {
    var label, top;
    if (closure != null) {
        label = closure.label;
        top = closure.scope;
    } else {
        label = this.label;
        top = this.top;
    }

    var stack = [];
    for (; top != this.global; top = top.parent) {
        stack.push(top.capture(this));
    }

    return [
        this.indexOfLabel(label),
        stack,
        this.global.capture(),
        [
            this.randomer._state0U | 0,
            this.randomer._state0L | 0,
            this.randomer._state1U | 0,
            this.randomer._state1L | 0
        ],
    ];
};

// istanbul ignore next
Engine.prototype.resume = function resume(snapshot) {
    this.render.clear();
    this.flush();
    this.label = this.start;
    this.instruction = this.story[this.label];
    this.global = new Global(this.handler);
    this.top = this.global;
    if (snapshot == null) {
        if (this.handler && this.handler.waypoint) {
            this.handler.waypoint(null, this);
        }
        this.continue();
        return;
    }

    // Destructure snapshot
    var label = this.labelOfIndex(snapshot[0]);
    var stack = snapshot[1];
    var global = snapshot[2];
    var random = snapshot[3];

    // Restore globals
    var keys = global[0];
    var values = global[1];
    for (var i = 0; i < keys.length; i++) {
        this.global.set(keys[i], values[i]);
    }

    // Restore stack
    var engine = this;
    this.top = stack.reduceRight(function (parent, snapshot) {
        return Frame.restore(engine, snapshot, parent);
    }, this.global);

    // Restore prng
    this.randomer._state0U = random[0];
    this.randomer._state0L = random[1];
    this.randomer._state1U = random[2];
    this.randomer._state1L = random[3];

    var instruction = this.story[label];
    if (instruction.type === 'opt') {
        if (this.gothrough(instruction.answer, 'RET')) {
            this.flush();
            this.continue();
        }
    } else {
        this.label = label;
        this.flush();
        this.continue();
    }
};

// istanbul ignore next
Engine.prototype.log = function log() {
    this.top.log();
    console.log('');
};

// Here begin the instructions

Engine.prototype.$text = function $text() {
    return this.write(this.instruction.text);
};

Engine.prototype.$echo = function $echo() {
    return this.write('' + evaluate(this.top, this.randomer, this.instruction.expression));
};

Engine.prototype.$br = function $br() {
    this.render.break();
    return this.goto(this.instruction.next);
};

Engine.prototype.$par = function $par() {
    this.render.paragraph();
    return this.goto(this.instruction.next);
};

Engine.prototype.$rule = function $rule() {
    // TODO
    this.render.paragraph();
    return this.goto(this.instruction.next);
};

Engine.prototype.$goto = function $goto() {
    return this.goto(this.instruction.next);
};

Engine.prototype.$call = function $call() {
    var label = this.instruction.label;
    var def = this.story[label];
    // istanbul ignore if
    if (!def) {
        console.error('no such procedure ' + label, this.instruction);
        return this.resume();
    }
    // istanbul ignore if
    if (def.type !== 'def') {
        console.error('Can\'t call non-procedure ' + label, this.instruction);
        return this.resume();
    }
    // istanbul ignore if
    if (def.locals.length !== this.instruction.args.length) {
        console.error('Argument length mismatch for ' + label, this.instruction, procedure);
        return this.resume();
    }
    // TODO replace this.global with closure scope if scoped procedures become
    // viable. This will require that the engine create references to closures
    // when entering a new scope (calling a procedure), in addition to
    // capturing locals. As such the parser will need to retain a reference to
    // the enclosing procedure and note all of the child procedures as they are
    // encountered.
    this.top = new Frame(this.top, def.locals, this.instruction.next, this.instruction.branch, this.label);
    for (var i = 0; i < this.instruction.args.length; i++) {
        var arg = this.instruction.args[i];
        var value = evaluate(this.top.parent, this.randomer, arg);
        this.top.set(def.locals[i], value);
    }
    return this.goto(label);
};

Engine.prototype.$def = function $def() {
    // Procedure argument instructions exist as targets for labels as well as
    // for reference to locals in calls.
    return this.goto(this.instruction.next);
};

Engine.prototype.$opt = function $opt() {
    var closure = new Closure(this.top, this.label);
    for (var i = 0; i < this.instruction.keywords.length; i++) {
        var keyword = this.instruction.keywords[i];
        // The first option to introduce a keyword wins, not the last.
        if (!this.keywords[keyword]) {
            this.keywords[keyword] = closure;
        }
    }
    if (this.instruction.question.length > 0) {
        this.options.push(closure);
        this.render.startOption();
        this.top = new Frame(this.top, [], this.instruction.next, 'RET', this.label, true);
        return this.gothrough(this.instruction.question, 'RET');
    } else if (this.noOption == null) {
        this.noOption = closure;
    }
    return this.goto(this.instruction.next);
};

Engine.prototype.$move = function $move() {
    var value = evaluate(this.top, this.randomer, this.instruction.source);
    var name = evaluate.nominate(this.top, this.randomer, this.instruction.target);
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + name + ' = ' + value);
    }
    this.top.set(name, value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$jump = function $jump() {
    var j = this.instruction;
    if (evaluate(this.top, this.randomer, j.condition)) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$switch = function $switch() {
    var branches = this.instruction.branches.slice();
    var weightExpressions = this.instruction.weights.slice();
    var samples = 1;
    var nexts = [];
    if (this.instruction.mode === 'pick') {
        samples = evaluate(this.top, this.randomer, this.instruction.expression);
    }
    for (var i = 0; i < samples; i++) {
        var value;
        var weights = [];
        var weight = weigh(this.top, this.randomer, weightExpressions, weights);
        if (this.instruction.mode === 'rand' || this.instruction.mode === 'pick') {
            if (weights.length === weight) {
                value = Math.floor(this.randomer.random() * branches.length);
            } else {
                value = pick(weights, weight, this.randomer);
                if (value == null) {
                    break;
                }
            }
        } else {
            value = evaluate(this.top, this.randomer, this.instruction.expression);
            if (this.instruction.variable != null) {
                this.top.set(this.instruction.variable, value + this.instruction.value);
            }
        }
        if (this.instruction.mode === 'loop') {
            // actual modulo, wraps negatives
            value = ((value % branches.length) + branches.length) % branches.length;
        } else if (this.instruction.mode === 'hash') {
            value = evaluate.hash(value) % branches.length;
        }
        value = Math.min(value, branches.length - 1);
        value = Math.max(value, 0);
        var next = branches[value];
        pop(branches, value);
        pop(weightExpressions, value);
        nexts.push(next);
    }
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + value + ' -> ' + next);
    }
    return this.gothrough(nexts, this.instruction.next);
};

Engine.prototype.$cue = function $cue() {
    if (this.handler != null && this.handler.cue != null) {
        return this.handler.cue(this.instruction.cue, this.instruction.next, this);
    } else {
        return this.goto(this.instruction.next);
    }
};

function weigh(scope, randomer, expressions, weights) {
    var weight = 0;
    for (var i = 0; i < expressions.length; i++) {
        weights[i] = evaluate(scope, randomer, expressions[i]);
        weight += weights[i];
    }
    return weight;
}

function pick(weights, weight, randomer) {
    var offset = Math.floor(randomer.random() * weight);
    var passed = 0;
    for (var i = 0; i < weights.length; i++) {
        passed += weights[i];
        if (offset < passed) {
            return i;
        }
    }
    return null;
}

function pop(array, index) {
    array[index] = array[array.length - 1];
    array.length--;
}

Engine.prototype.$ask = function $ask() {
    this.ask();
    return false;
};

Engine.prototype.$read = function $read() {
    this.read();
    return false;
};

function Global(handler) {
    this.scope = Object.create(null);
    this.handler = handler;
    this.next = 'RET';
    this.branch = 'RET';
    Object.seal(this);
}

Global.prototype.get = function get(name) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
        return this.handler.get(name);
    } else {
        return this.scope[name] || 0;
    }
};

Global.prototype.set = function set(name, value) {
    if (this.handler && this.handler.has && this.handler.has(name)) {
        this.handler.set(name, value);
    } else {
        this.scope[name] = value;
    }
    if (this.handler && this.handler.changed) {
        this.handler.changed(name, value);
    }
};

// istanbul ignore next
Global.prototype.log = function log() {
    var names = Object.keys(this.scope);
    names.sort();
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var value = this.scope[name];
        console.log(name + ' = ' + value);
    }
    console.log('');
};

// istanbul ignore next
Global.prototype.at = function at() {
    return '';
};

Global.prototype.capture = function () {
    var names = Object.keys(this.scope);
    var values = [];
    for (var i = 0; i < names.length; i++) {
        values[i] = this.scope[names[i]] || 0;
    }
    return [names, values];
};

function Frame(parent, locals, next, branch, label, stopOption) {
    this.locals = locals;
    this.scope = Object.create(null);
    for (var i = 0; i < locals.length; i++) {
        this.scope[locals[i]] = 0;
    }
    this.parent = parent;
    this.next = next;
    this.branch = branch;
    this.label = label;
    this.stopOption = stopOption || false;
    Object.seal(this);
}

Frame.prototype.get = function get(name) {
    if (this.locals.indexOf(name) >= 0) {
        return this.scope[name];
    }
    return this.parent.get(name);
};

Frame.prototype.set = function set(name, value) {
    // istanbul ignore else
    if (this.locals.indexOf(name) >= 0) {
        this.scope[name] = value;
        return;
    }
    this.parent.set(name, value);
};

// istanbul ignore next
Frame.prototype.log = function log() {
    this.parent.log();
    console.log('--- ' + this.label + ' -> ' + this.next);
    for (var i = 0; i < this.locals.length; i++) {
        var name = this.locals[i];
        var value = this.scope[name];
        console.log(name + ' = ' + value);
    }
};

// istanbul ignore next
Frame.prototype.at = function at() {
    return this.parent.at() + '/' + this.label;
};

Frame.prototype.capture = function capture(engine) {
    var values = [];
    for (var i = 0; i < this.locals.length; i++) {
        var local = this.locals[i];
        values.push(this.scope[local] || 0);
    }

    return [
        engine.indexOfLabel(this.label),
        engine.indexOfLabel(this.next),
        engine.indexOfLabel(this.branch),
        values,
        +this.stopOption,
    ];
};

Frame.restore = function (engine, snapshot, parent) {
    var label = engine.labelOfIndex(snapshot[0]);
    var next = engine.labelOfIndex(snapshot[1]);
    var branch = engine.labelOfIndex(snapshot[2]);
    var values = snapshot[3];
    var stopOption = Boolean(snapshot[4]);

    var frame = new Frame(parent, [], next, branch, label, stopOption);

    // Technically, not all frames correspond to subroutine calls, but all
    // frames that remain when the engine pauses ought to be.
    // The exceptions would be interstitial frames generated by gothrough,
    // but all of these are exhausted before the engine stops to ask a prompt.
    var call = engine.story[label];
    var def = engine.story[call.label];
    frame.locals = def.locals;
    for (var i = 0; i < values.length; i++) {
        var name = def.locals[i];
        frame.scope[name] = values[i];
    }

    return frame;
};

Engine.prototype.labelOfIndex = function (index) {
    if (index == -2) {
        return 'RET';
    } else if (index === -3) {
        return 'ESC';
    }
    return this.labels[index];
};

Engine.prototype.indexOfLabel = function (label) {
    if (label === 'RET') {
        return -2;
    } else if (label === 'ESC') {
        return -3;
    }
    return this.labels.indexOf(label);
};

function Closure(scope, label) {
    this.scope = scope;
    this.label = label;
    Object.seal(this);
}

}],["evaluate.js","kni","evaluate.js",{},function (require, exports, module, __filename, __dirname){

// kni/evaluate.js
// ---------------

'use strict';

module.exports = evaluate;

function evaluate(scope, randomer, args) {
    var name = args[0];
    if (unary[name] && args.length === 2) {
        return unary[name](
            evaluate(scope, randomer, args[1]),
            scope,
            randomer
        );
    } else if (binary[name] && args.length === 3) {
        return binary[name](
            evaluate(scope, randomer, args[1]),
            evaluate(scope, randomer, args[2]),
            scope,
            randomer
        );
    } else if (name === 'val') {
        return args[1];
    } else if (name === 'get') {
        return scope.get(args[1]);
    // istanbul ignore else
    } else if (name === 'var') {
        return scope.get(nominate(scope, randomer, args));
    } else if (name === 'call') {
        var name = args[1][1];
        var f = functions[name];
        if (!f) {
            // TODO thread line number for containing instruction
            throw new Error('No function named ' + name);
        }
        var values = [];
        for (var i = 2; i < args.length; i++) {
            values.push(evaluate(scope, randomer, args[i]));
        }
        return f.apply(null, values);
    } else {
        throw new Error('Unexpected operator ' + JSON.stringify(args));
    }
}

evaluate.nominate = nominate;
function nominate(scope, randomer, args) {
    if (args[0] === 'get') {
        return args[1];
    }
    var literals = args[1];
    var variables = args[2];
    var name = '';
    for (var i = 0; i < variables.length; i++) {
        name += literals[i] + evaluate(scope, randomer, variables[i]);
    }
    name += literals[i];
    return name;
}

var functions = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan2: Math.atan2,
    atan: Math.atan,
    exp: Math.exp,
    log: Math.log,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    sin: Math.sin,
    tan: Math.tan,

    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,

    sign: function (x) {
        if (x < 0) {
            return -1;
        }
        if (x > 0) {
            return 1;
        }
        return 0;
    },

    mean: function () {
        var mean = 0;
        for (var i = 0; i < arguments.length; i++) {
            mean += arguments[i];
        }
        return mean / i;
    },

    root: function root(x, y) {
        if (y === 2 || y == null) {
            return Math.sqrt(x);
        }
        return Math.pow(x, 1 / y);
    },

    distance: function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    manhattan: function distance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    // TODO parameterize these functions in terms of the expected turns to
    // go from 25% to 75% of capacity, to adjust the rate. This will maybe
    // almost make them understandable.
    //
    // sigmoid: function (steps, cap) {
    //     if (steps === -Infinity) {
    //         return 0;
    //     } else if (steps === Infinity) {
    //         return cap;
    //     } else {
    //         return cap / (1 + Math.pow(Math.E, -steps));
    //     }
    // },

    // diomgis: function (pop, cap) {
    //     if (pop <= 0) {
    //         return -Infinity;
    //     }
    //     var ratio = cap / pop - 1;
    //     if (ratio === 0) {
    //         return Infinity;
    //     }
    //     return -Math.log(ratio, Math.E);
    // },

};

var binary = {
    '+': function (x, y) {
        return x + y;
    },
    '-': function (x, y) {
        return x - y;
    },
    '*': function (x, y) {
        return x * y;
    },
    '/': function (x, y) {
        return (x / y) >> 0;
    },
    '%': function (x, y) {
        return ((x % y) + y) % y;
    },
    '**': function (x, y) {
        return Math.pow(x, y);
    },
    'or': function (x, y) {
        return x || y ? 1 : 0;
    },
    'and': function (x, y) {
        return x && y ? 1 : 0;
    },
    '>=': function (x, y) {
        return x >= y ? 1 : 0;
    },
    '>': function (x, y) {
        return x > y ? 1 : 0;
    },
    '<=': function (x, y) {
        return x <= y ? 1 : 0;
    },
    '<': function (x, y) {
        return x < y ? 1 : 0;
    },
    '==': function (x, y) {
        return x === y ? 1 : 0;
    },
    '<>': function (x, y) {
        return x != y ? 1 : 0;
    },
    '#': function (x, y) {
        return hilbert(x, y);
    },
    '~': function (x, y, _scope, randomer) {
        var r = 0;
        for (var i = 0; i < x; i++) {
            r += randomer.random() * y;
        }
        return Math.floor(r);
    }
};

// istanbul ignore next
var unary = {
    'not': function (x) {
        return x ? 0 : 1;
    },
    '-': function (x) {
        return -x;
    },
    '~': function (x, _scope, randomer) {
        return Math.floor(randomer.random() * x);
    },
    '#': function (x) {
        return hash(x);
    }
};

// Robert Jenkins's 32 bit hash function
// https://gist.github.com/badboy/6267743
evaluate.hash = hash;
function hash(a) {
    a = (a+0x7ed55d16) + (a<<12);
    a = (a^0xc761c23c) ^ (a>>>19);
    a = (a+0x165667b1) + (a<<5);
    a = (a+0xd3a2646c) ^ (a<<9);
    a = (a+0xfd7046c5) + (a<<3);
    a = (a^0xb55a4f09) ^ (a>>>16);
    return a;
}

// hilbert in range from 0 to 2^32
// x and y in range from 0 to 2^16
// each dimension has origin at 2^15
var dimensionWidth = (-1 >>> 16) + 1;
var halfDimensionWidth = dimensionWidth / 2;
function hilbert(x, y) {
    x += halfDimensionWidth;
    y += halfDimensionWidth;
    var rx = 0;
    var ry = y;
    var scalar = 0;
    for (var scale = dimensionWidth; scale > 0; scale /= 2) {
        rx = x & scale;
        ry = y & scale;
        scalar += scale * ((3 * rx) ^ ry);
        // rotate
        if (!ry) {
            if (rx) {
                x = scale - 1 - x;
                y = scale - 1 - y;
            }
            // transpose
            var t = x;
            x = y;
            y = t;
        }
    }
    return scalar;
}

}],["examples/archery.json","kni/examples","archery.json",{},function (require, exports, module, __filename, __dirname){

// kni/examples/archery.json
// -------------------------

module.exports = {
    "start": {
        "type": "move",
        "source": [
            "val",
            2
        ],
        "target": [
            "get",
            "gold"
        ],
        "next": "start.1",
        "position": "2:3"
    },
    "start.1": {
        "type": "move",
        "source": [
            "val",
            0
        ],
        "target": [
            "get",
            "arrow"
        ],
        "next": "start.2",
        "position": "3:3"
    },
    "start.2": {
        "type": "move",
        "source": [
            "val",
            0
        ],
        "target": [
            "get",
            "score"
        ],
        "next": "start.3",
        "position": "4:3"
    },
    "start.3": {
        "type": "text",
        "text": "You enter the fletcher’s shop. The fletcher beckons, “There are arrows for sale and a range out back to try your skill and fortune. For each score hit, you win more gold!”",
        "lift": "",
        "drop": " ",
        "next": "start.4",
        "position": "7:1"
    },
    "start.4": {
        "type": "par",
        "next": "shop",
        "position": "7:1"
    },
    "shop": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "shop.1",
        "position": "11:3"
    },
    "shop.1": {
        "type": "call",
        "label": "arrow",
        "args": [],
        "next": "shop.2",
        "branch": "shop",
        "position": "11:3"
    },
    "shop.2": {
        "type": "switch",
        "expression": [
            "get",
            "arrow"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.2.1",
            "shop.2.2"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "12:3"
    },
    "shop.2.1": {
        "type": "switch",
        "expression": [
            "get",
            "gold"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.2.1.0.1",
            "shop.2.1.0.2"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "12:3"
    },
    "shop.2.1.0.1": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "shop.3",
        "position": "12:3"
    },
    "shop.2.1.0.2": {
        "type": "text",
        "text": "but",
        "lift": " ",
        "drop": " ",
        "next": "shop.3",
        "position": "12:3"
    },
    "shop.2.2": {
        "type": "text",
        "text": "and",
        "lift": " ",
        "drop": " ",
        "next": "shop.3",
        "position": "12:3"
    },
    "shop.3": {
        "type": "call",
        "label": "gold",
        "args": [],
        "next": "shop.4",
        "branch": "shop",
        "position": "13:3"
    },
    "shop.4": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "shop.5",
        "position": "15:3"
    },
    "shop.5": {
        "type": "switch",
        "expression": [
            "and",
            [
                "not",
                [
                    "get",
                    "gold"
                ]
            ],
            [
                "not",
                [
                    "get",
                    "arrow"
                ]
            ]
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "shop.5.1",
            "shop.5.2"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "15:3"
    },
    "shop.5.1": {
        "type": "goto",
        "next": "shop.6",
        "position": "15:3"
    },
    "shop.5.2": {
        "type": "goto",
        "next": "exit",
        "position": "15:3"
    },
    "shop.6": {
        "type": "jump",
        "condition": [
            "==",
            [
                ">=",
                [
                    "get",
                    "gold"
                ],
                [
                    "val",
                    1
                ]
            ],
            [
                "val",
                0
            ]
        ],
        "branch": "shop.7",
        "next": "shop.6.1",
        "position": "18:5"
    },
    "shop.6.1": {
        "type": "opt",
        "question": [
            "shop.6.3",
            "shop.6.4"
        ],
        "answer": [
            "shop.6.2",
            "shop.6.4",
            "shop.6.5",
            "shop.6.7"
        ],
        "keywords": [],
        "next": "shop.7",
        "position": "18:5"
    },
    "shop.6.2": {
        "type": "text",
        "text": "You b",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "18:5"
    },
    "shop.6.3": {
        "type": "text",
        "text": "B",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "18:5"
    },
    "shop.6.4": {
        "type": "text",
        "text": "uy 3 arrows for a gold piece.",
        "lift": "",
        "drop": " ",
        "next": "RET",
        "position": "18:5"
    },
    "shop.6.5": {
        "type": "move",
        "source": [
            "-",
            [
                "get",
                "gold"
            ],
            [
                "val",
                1
            ]
        ],
        "target": [
            "get",
            "gold"
        ],
        "next": "shop.6.6",
        "position": "18:5"
    },
    "shop.6.6": {
        "type": "move",
        "source": [
            "+",
            [
                "get",
                "arrow"
            ],
            [
                "val",
                3
            ]
        ],
        "target": [
            "get",
            "arrow"
        ],
        "next": "RET",
        "position": "18:5"
    },
    "shop.6.7": {
        "type": "goto",
        "next": "shop",
        "position": "19:5"
    },
    "shop.7": {
        "type": "jump",
        "condition": [
            "==",
            [
                ">=",
                [
                    "get",
                    "arrow"
                ],
                [
                    "val",
                    4
                ]
            ],
            [
                "val",
                0
            ]
        ],
        "branch": "shop.8",
        "next": "shop.7.1",
        "position": "20:5"
    },
    "shop.7.1": {
        "type": "opt",
        "question": [
            "shop.7.3",
            "shop.7.4"
        ],
        "answer": [
            "shop.7.2",
            "shop.7.4",
            "shop.7.5",
            "shop.7.7"
        ],
        "keywords": [],
        "next": "shop.8",
        "position": "20:5"
    },
    "shop.7.2": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "20:5"
    },
    "shop.7.3": {
        "type": "text",
        "text": "S",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "20:5"
    },
    "shop.7.4": {
        "type": "text",
        "text": "ell 4 arrows for a gold piece.",
        "lift": "",
        "drop": " ",
        "next": "RET",
        "position": "20:5"
    },
    "shop.7.5": {
        "type": "move",
        "source": [
            "+",
            [
                "get",
                "gold"
            ],
            [
                "val",
                1
            ]
        ],
        "target": [
            "get",
            "gold"
        ],
        "next": "shop.7.6",
        "position": "20:5"
    },
    "shop.7.6": {
        "type": "move",
        "source": [
            "-",
            [
                "get",
                "arrow"
            ],
            [
                "val",
                4
            ]
        ],
        "target": [
            "get",
            "arrow"
        ],
        "next": "RET",
        "position": "20:5"
    },
    "shop.7.7": {
        "type": "goto",
        "next": "shop",
        "position": "21:5"
    },
    "shop.8": {
        "type": "opt",
        "question": [
            "shop.8.2",
            "shop.8.3"
        ],
        "answer": [
            "shop.8.1",
            "shop.8.3",
            "shop.8.4"
        ],
        "keywords": [],
        "next": "shop.9",
        "position": "21:5"
    },
    "shop.8.1": {
        "type": "text",
        "text": "You walk through the door to",
        "lift": "",
        "drop": " ",
        "next": "RET",
        "position": "21:5"
    },
    "shop.8.2": {
        "type": "text",
        "text": "Visit",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "21:5"
    },
    "shop.8.3": {
        "type": "text",
        "text": "the archery range.",
        "lift": " ",
        "drop": " ",
        "next": "RET",
        "position": "21:5"
    },
    "shop.8.4": {
        "type": "goto",
        "next": "range",
        "position": "21:5"
    },
    "shop.9": {
        "type": "opt",
        "question": [
            "shop.9.1"
        ],
        "answer": [
            "shop.9.2"
        ],
        "keywords": [],
        "next": "shop.10",
        "position": "23:5"
    },
    "shop.9.1": {
        "type": "text",
        "text": "Leave the store.",
        "lift": "",
        "drop": " ",
        "next": "RET",
        "position": "23:5"
    },
    "shop.9.2": {
        "type": "goto",
        "next": "exit",
        "position": "23:5"
    },
    "shop.10": {
        "type": "ask",
        "position": "24:3"
    },
    "range": {
        "type": "text",
        "text": "You have",
        "lift": "",
        "drop": " ",
        "next": "range.1",
        "position": "30:3"
    },
    "range.1": {
        "type": "call",
        "label": "arrow",
        "args": [],
        "next": "range.2",
        "branch": "range",
        "position": "30:3"
    },
    "range.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "range.3",
        "position": "32:5"
    },
    "range.3": {
        "type": "jump",
        "condition": [
            "==",
            [
                ">=",
                [
                    "get",
                    "arrow"
                ],
                [
                    "val",
                    1
                ]
            ],
            [
                "val",
                0
            ]
        ],
        "branch": "range.4",
        "next": "range.3.1",
        "position": "33:5"
    },
    "range.3.1": {
        "type": "opt",
        "question": [
            "range.3.3",
            "range.3.4",
            "range.3.5"
        ],
        "answer": [
            "range.3.2",
            "range.3.4",
            "range.3.6",
            "range.3.7"
        ],
        "keywords": [],
        "next": "range.4",
        "position": "33:5"
    },
    "range.3.2": {
        "type": "text",
        "text": "You s",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "33:5"
    },
    "range.3.3": {
        "type": "text",
        "text": "S",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "33:5"
    },
    "range.3.4": {
        "type": "text",
        "text": "hoot an arrow",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "33:5"
    },
    "range.3.5": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "33:5"
    },
    "range.3.6": {
        "type": "move",
        "source": [
            "-",
            [
                "get",
                "arrow"
            ],
            [
                "val",
                1
            ]
        ],
        "target": [
            "get",
            "arrow"
        ],
        "next": "RET",
        "position": "33:5"
    },
    "range.3.7": {
        "type": "switch",
        "expression": [
            "get",
            "range.3.7"
        ],
        "variable": "range.3.7",
        "value": 0,
        "mode": "rand",
        "branches": [
            "range.3.7.1",
            "range.3.7.2",
            "range.3.7.3"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "34:5"
    },
    "range.3.7.1": {
        "type": "text",
        "text": "and hit the target, winning 1 gold piece!",
        "lift": " ",
        "drop": " ",
        "next": "range.3.7.1.1",
        "position": "35:5"
    },
    "range.3.7.1.1": {
        "type": "move",
        "source": [
            "+",
            [
                "get",
                "gold"
            ],
            [
                "val",
                1
            ]
        ],
        "target": [
            "get",
            "gold"
        ],
        "next": "range.3.7.1.2",
        "position": "35:5"
    },
    "range.3.7.1.2": {
        "type": "move",
        "source": [
            "+",
            [
                "get",
                "score"
            ],
            [
                "val",
                1
            ]
        ],
        "target": [
            "get",
            "score"
        ],
        "next": "range",
        "position": "35:5"
    },
    "range.3.7.2": {
        "type": "goto",
        "next": "range.3.8",
        "position": "35:5"
    },
    "range.3.7.3": {
        "type": "goto",
        "next": "range.3.8",
        "position": "35:5"
    },
    "range.3.8": {
        "type": "text",
        "text": "and miss.",
        "lift": " ",
        "drop": " ",
        "next": "range",
        "position": "37:5"
    },
    "range.4": {
        "type": "opt",
        "question": [
            "range.4.2",
            "range.4.3"
        ],
        "answer": [
            "range.4.1",
            "range.4.3",
            "range.4.4"
        ],
        "keywords": [],
        "next": "range.5",
        "position": "37:5"
    },
    "range.4.1": {
        "type": "text",
        "text": "You r",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "37:5"
    },
    "range.4.2": {
        "type": "text",
        "text": "R",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "37:5"
    },
    "range.4.3": {
        "type": "text",
        "text": "eturn to the archery shop.",
        "lift": "",
        "drop": " ",
        "next": "RET",
        "position": "37:5"
    },
    "range.4.4": {
        "type": "goto",
        "next": "shop",
        "position": "37:5"
    },
    "range.5": {
        "type": "ask",
        "position": "38:3"
    },
    "arrow": {
        "type": "def",
        "locals": [],
        "next": "arrow.1",
        "position": "42:3"
    },
    "arrow.1": {
        "type": "switch",
        "expression": [
            "get",
            "arrow"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "arrow.1.1",
            "arrow.1.2",
            "arrow.1.3"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "43:3"
    },
    "arrow.1.1": {
        "type": "text",
        "text": "no arrows",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "43:3"
    },
    "arrow.1.2": {
        "type": "text",
        "text": "an arrow",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "43:3"
    },
    "arrow.1.3": {
        "type": "echo",
        "expression": [
            "get",
            "arrow"
        ],
        "lift": "",
        "drop": "",
        "next": "arrow.1.3.1",
        "position": "43:3"
    },
    "arrow.1.3.1": {
        "type": "text",
        "text": "arrows",
        "lift": " ",
        "drop": "",
        "next": "RET",
        "position": "43:3"
    },
    "gold": {
        "type": "def",
        "locals": [],
        "next": "gold.1",
        "position": "45:3"
    },
    "gold.1": {
        "type": "switch",
        "expression": [
            "get",
            "gold"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "gold.1.1",
            "gold.1.2",
            "gold.1.3"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "46:3"
    },
    "gold.1.1": {
        "type": "text",
        "text": "no gold",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "46:3"
    },
    "gold.1.2": {
        "type": "text",
        "text": "a gold piece",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "46:3"
    },
    "gold.1.3": {
        "type": "echo",
        "expression": [
            "get",
            "gold"
        ],
        "lift": "",
        "drop": "",
        "next": "gold.1.3.1",
        "position": "46:3"
    },
    "gold.1.3.1": {
        "type": "text",
        "text": "gold",
        "lift": " ",
        "drop": "",
        "next": "RET",
        "position": "46:3"
    },
    "exit": {
        "type": "text",
        "text": "You depart the store through the back door with",
        "lift": " ",
        "drop": " ",
        "next": "exit.1",
        "position": "49:3"
    },
    "exit.1": {
        "type": "call",
        "label": "gold",
        "args": [],
        "next": "exit.2",
        "branch": "ESC",
        "position": "49:3"
    },
    "exit.2": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": " ",
        "next": "exit.3",
        "position": "50:3"
    },
    "exit.3": {
        "type": "switch",
        "expression": [
            "get",
            "score"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "exit.3.1",
            "exit.3.2"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "50:3"
    },
    "exit.3.1": {
        "type": "goto",
        "next": "RET",
        "position": "50:3"
    },
    "exit.3.2": {
        "type": "text",
        "text": "All told, you scored",
        "lift": "",
        "drop": " ",
        "next": "exit.3.2.1",
        "position": "50:3"
    },
    "exit.3.2.1": {
        "type": "echo",
        "expression": [
            "get",
            "score"
        ],
        "lift": "",
        "drop": "",
        "next": "exit.3.2.2",
        "position": "50:3"
    },
    "exit.3.2.2": {
        "type": "text",
        "text": "hit",
        "lift": " ",
        "drop": "",
        "next": "exit.3.2.3",
        "position": "50:3"
    },
    "exit.3.2.3": {
        "type": "switch",
        "expression": [
            "get",
            "score"
        ],
        "variable": null,
        "value": 0,
        "mode": "walk",
        "branches": [
            "exit.3.2.3.1",
            "exit.3.2.3.2",
            "exit.3.2.3.3"
        ],
        "weights": [
            [
                "val",
                1
            ],
            [
                "val",
                1
            ],
            [
                "val",
                1
            ]
        ],
        "next": "RET",
        "position": "50:3"
    },
    "exit.3.2.3.1": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "exit.3.2.4",
        "position": "50:3"
    },
    "exit.3.2.3.2": {
        "type": "goto",
        "next": "exit.3.2.4",
        "position": "50:3"
    },
    "exit.3.2.3.3": {
        "type": "text",
        "text": "s",
        "lift": "",
        "drop": "",
        "next": "exit.3.2.4",
        "position": "50:3"
    },
    "exit.3.2.4": {
        "type": "text",
        "text": ".",
        "lift": "",
        "drop": "",
        "next": "RET",
        "position": "50:3"
    }
}

}],["index.js","kni","index.js",{"./engine":2,"./examples/archery.json":4,"./document":1},function (require, exports, module, __filename, __dirname){

// kni/index.js
// ------------

'use strict';

var Engine = require('./engine');
var story = require('./examples/archery.json');
var Document = require('./document');

var reset = document.querySelector(".reset");
reset.onclick = function onclick() {
    engine.resume();
};

var doc = new Document(document.body);
var engine = new Engine({
    story: story,
    render: doc,
    dialog: doc,
    handler: {
        waypoint: function waypoint(waypoint) {
            var json = JSON.stringify(waypoint);
            window.history.pushState(waypoint, '', '#' + btoa(json));
            localStorage.setItem('archery.kni', json);
        },
        goto: function _goto(label) {
            console.log(label);
        },
        answer: function answer(text) {
            console.log('>', text);
        }
    }
});

doc.clear();

var waypoint;
var json;
if (waypoint = window.location.hash || null) {
    try {
        waypoint = atob(waypoint.slice(1));
        waypoint = JSON.parse(waypoint);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
} else if (json = localStorage.getItem('archery.kni')) {
    try {
        waypoint = JSON.parse(json);
    } catch (error) {
        console.error(error);
        waypoint = null;
    }
    window.history.replaceState(waypoint, '', '#' + btoa(json));
}

window.onpopstate = function onpopstate(event) {
    console.log('> back');
    engine.resume(event.state);
};

engine.resume(waypoint);

window.onkeypress = function onkeypress(event) {
    var key = event.code;
    var match = /^Digit(\d+)$/.exec(key);
    if (match) {
        engine.answer(match[1]);
    } else if (key === 'KeyR') {
        engine.resume();
    }
};

}]])("kni/index.js")