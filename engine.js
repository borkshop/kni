'use strict';

var Story = require('./story');
var evaluate = require('./evaluate');

module.exports = Engine;

var debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

function Engine(story, start, render, interlocutor, randomer) {
    // istanbul ignore next
    start = start || 'start';
    var self = this;
    this.story = story;
    this.options = [];
    this.keywords = {};
    this.variables = {};
    this.global = new Global(randomer);
    this.top = this.global;
    this.stack = [this.top];
    this.label = '';
    this.instruction = new Story.constructors.goto(start);
    this.render = render;
    this.interlocutor = interlocutor;
    this.interlocutor.engine = this;
    this.randomer = randomer;
    this.debug = debug;
    Object.seal(this);
}

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        // istanbul ignore if
        if (this.debug) {
            console.log(this.top.at() + '/' + this.label + ' ' + this.instruction.type + ' ' + this.instruction.describe());
        }
        // istanbul ignore if
        if (!this['$' + this.instruction.type]) {
            throw new Error('Unexpected instruction type: ' + this.instruction.type);
        }
        _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
};

Engine.prototype.print = function print(text) {
    this.render.write(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
};

Engine.prototype.$text = function text() {
    return this.print(this.instruction.text);
};

Engine.prototype.$print = function print() {
    return this.print('' + evaluate(this.top, this.instruction.expression));
};

Engine.prototype.$break = function $break() {
    this.render.break();
    return this.goto(this.instruction.next);
};

Engine.prototype.$paragraph = function $paragraph() {
    this.render.paragraph();
    return this.goto(this.instruction.next);
};

Engine.prototype.$startJoin = function $startJoin() {
    this.render.startJoin(
        this.instruction.lift,
        this.instruction.delimiter,
        this.instruction.text
    );
    return this.goto(this.instruction.next);
};

Engine.prototype.$delimit = function $delimit() {
    this.render.delimit(this.instruction.delimiter);
    return this.goto(this.instruction.next);
};

Engine.prototype.$stopJoin = function $stopJoin() {
    // TODO thread for "if no delimits"
    this.render.stopJoin();
    return this.goto(this.instruction.next);
};

Engine.prototype.$goto = function $goto() {
    return this.goto(this.instruction.next);
};

Engine.prototype.$call = function $call() {
    var routine = this.story[this.instruction.label];
    // istanbul ignore if
    if (!routine) {
        throw new Error('no such routine ' + this.instruction.label);
    }
    // TODO replace this.global with closure scope if scoped procedures become
    // viable. This will require that the engine create references to closures
    // when entering a new scope (calling a procedure), in addition to
    // capturing locals. As such the parser will need to retain a reference to
    // the enclosing procedure and note all of the child procedures as they are
    // encountered.
    this.top = new Frame(this.global, routine.locals || [], this.instruction.next, this.instruction.branch);
    this.stack.push(this.top);
    return this.goto(this.instruction.branch);
};

Engine.prototype.$subroutine = function $subroutine() {
    // Subroutines exist as targets for labels as well as for reference to
    // locals in calls.
    return this.goto(this.instruction.next);
};

Engine.prototype.$option = function option() {
    this.options.push(this.instruction);
    // for (var i = 0; i < this.instruction.keywords.length; i++) {
    //     var keyword = this.instruction.keywords[i];
    //     this.keywords[keyword] = this.instruction.branch;
    // }
    return this.goto(this.instruction.next);
};

Engine.prototype.$set = function set() {
    var value = evaluate(this.top, this.instruction.expression);
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + this.instruction.variable + ' = ' + value);
    }
    this.top.set(this.instruction.variable, value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$mov = function mov() {
    var value = evaluate(this.top, this.instruction.source);
    var name = evaluate.nominate(this.top, this.instruction.target);
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + name + ' = ' + value);
    }
    this.top.set(name, value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$jump = function jump() {
    var j = this.instruction;
    if (evaluate(this.top, j.condition)) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.$switch = function _switch() {
    var branches = this.instruction.branches;
    var value;
    if (this.instruction.mode === 'rand') {
        value = Math.floor(this.randomer.random() * branches.length);
    } else {
        value = evaluate(this.top, this.instruction.expression);
        this.top.set(this.instruction.variable, value + this.instruction.value);
    }
    if (this.instruction.mode === 'loop') {
        value = value % branches.length;
    } else if (this.instruction.mode === 'hash') {
        value = evaluate.hash(value) % branches.length;
    }
    value = Math.min(value, branches.length - 1);
    value = Math.max(value, 0);
    var next = branches[value];
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + value + ' -> ' + next);
    }
    return this.goto(next);
};

Engine.prototype.$prompt = function prompt() {
    this.prompt();
    return false;
};

Engine.prototype.goto = function _goto(name) {
    while (name === null && this.stack.length > 1 && this.options.length === 0) {
        var top = this.stack.pop();
        this.top = this.stack[this.stack.length - 1];
        name = top.next;
    }
    if (name == null) {
        this.display();
        this.render.break();
        this.interlocutor.close();
        return false;
    }
    var next = this.story[name];
    // istanbul ignore if
    if (!next) {
        throw new Error('Story missing knot for name: ' + name);
    }
    this.label = name;
    this.instruction = next;
    return true;
};

Engine.prototype.answer = function answer(text) {
    this.render.flush();
    if (text === 'quit') {
        this.interlocutor.close();
        return;
    }
    // istanbul ignore next
    if (text === 'bt') {
        this.render.clear();
        this.top.log();
        this.prompt();
        return;
    }
    var n = +text;
    if (n >= 1 && n <= this.options.length) {
        this.render.clear();
        if (this.goto(this.options[n - 1].branch)) {
            this.flush();
            this.continue();
        }
    // istanbul ignore next
    } else if (this.keywords[text]) {
        this.render.clear();
        if (this.goto(this.keywords[text])) {
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
};

function Global(randomer) {
    this.scope = Object.create(null);
    this.randomer = randomer;
    this.next = null;
}

Global.prototype.get = function get(name) {
    return this.scope[name] || 0;
};

Global.prototype.set = function set(name, value) {
    this.scope[name] = value;
};

Global.prototype.random = function random() {
    return this.randomer.random();
};

// istanbul ignore next
Global.prototype.log = function log() {
    var globals = Object.keys(this.scope);
    for (var i = 0; i < globals.length; i++) {
        var name = globals[i];
        var value = this.scope[name];
        console.log(name + ' = ' + value);
    }
    render.paragraph();
};

// istanbul ignore next
Global.prototype.at = function at() {
    return '';
};

function Frame(caller, locals, next, branch) {
    this.locals = locals;
    this.scope = Object.create(null);
    for (var i = 0; i < locals.length; i++) {
        this.scope[locals[i]] = 0;
    }
    this.caller = caller;
    this.next = next;
    this.branch = branch;
}

Frame.prototype.get = function get(name) {
    if (this.locals.indexOf(name) >= 0) {
        return this.scope[name];
    }
    return this.caller.get(name);
};

Frame.prototype.set = function set(name, value) {
    // istanbul ignore else
    if (this.locals.indexOf(name) >= 0) {
        this.scope[name] = value;
        return;
    }
    this.caller.set(name, value);
};

Frame.prototype.random = function random() {
    return this.caller.random();
};

// istanbul ignore next
Frame.prototype.log = function log() {
    console.log('--- ' + this.branch + ' -> ' + this.next);
    for (var i = 0; i < this.locals.length; i++) {
        var name = this.locals[i];
        var value = this.scope[name];
        console.log(name + ' = ' + value);
    }
};

// istanbul ignore next
Frame.prototype.at = function at() {
    return this.caller.at() + '/' + this.branch;
};
