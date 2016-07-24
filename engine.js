'use strict';

var Story = require('./story');
var evaluate = require('./evaluate');
var describe = require('./describe');

module.exports = Engine;

var debug = typeof process === 'object' && process.env.DEBUG_ENGINE;

function Engine(args) {
    // istanbul ignore next
    var self = this;
    this.story = args.story;
    this.options = [];
    this.storage = args.storage || new Global();
    this.top = this.storage;
    this.stack = [this.top];
    this.label = '';
    // istanbul ignore next
    var start = args.start || this.storage.get('@') || 'start';
    this.instruction = new Story.constructors.goto(start);
    this.render = args.render;
    this.dialog = args.dialog;
    this.dialog.engine = this;
    // istanbul ignore next
    this.randomer = args.randomer || Math;
    this.debug = debug;
    this.end = this.end;
    Object.seal(this);
}

Engine.prototype.end = function end() {
    this.display();
    this.render.break();
    this.dialog.close();
    return false;
};

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        // istanbul ignore if
        if (this.debug) {
            console.log(this.top.at() + '/' + this.label + ' ' + this.instruction.type + ' ' + describe(this.instruction));
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

Engine.prototype.$text = function $text() {
    return this.print(this.instruction.text);
};

Engine.prototype.$echo = function $echo() {
    return this.print('' + evaluate(this.top, this.randomer, this.instruction.expression));
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

Engine.prototype.$apply = function $apply() {
    var procedure = this.story[this.instruction.branch];
    // istanbul ignore if
    if (!procedure) {
        throw new Error('no such procedure ' + this.instruction.branch);
    }
    // istanbul ignore if
    if (procedure.type !== 'args') {
        throw new Error('can\'t call non-procedure ' + this.instruction.branch);
    }
    // istanbul ignore if
    if (procedure.locals.length !== this.instruction.args.length) {
        throw new Error('argument length mismatch for ' + this.instruction.branch);
    }
    // TODO replace this.storage with closure scope if scoped procedures become
    // viable. This will require that the engine create references to closures
    // when entering a new scope (calling a procedure), in addition to
    // capturing locals. As such the parser will need to retain a reference to
    // the enclosing procedure and note all of the child procedures as they are
    // encountered.
    this.top = new Frame(this.top, this.storage, procedure.locals, this.instruction.next, this.label);
    this.stack.push(this.top);
    for (var i = 0; i < this.instruction.args.length; i++) {
        var arg = this.instruction.args[i];
        var value = evaluate(this.top.caller, this.randomer, arg);
        this.top.set(procedure.locals[i], value);
    }
    return this.goto(this.instruction.branch);
};

Engine.prototype.$args = function $args() {
    // Procedure argument instructions exist as targets for labels as well as
    // for reference to locals in calls.
    return this.goto(this.instruction.next);
};

Engine.prototype.$opt = function $opt() {
    var option = this.instruction;
    this.options.push(option);
    this.render.startOption();
    return this.gothrough(option.question, this.instruction.next, true);
};

Engine.prototype.$set = function $set() {
    var value = evaluate(this.top, this.randomer, this.instruction.expression);
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + this.instruction.variable + ' == ' + value);
    }
    this.top.set(this.instruction.variable, value);
    return this.goto(this.instruction.next);
};

Engine.prototype.$mov = function $mov() {
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
    var branches = this.instruction.branches;
    var value;
    if (this.instruction.mode === 'rand') {
        value = Math.floor(this.randomer.random() * branches.length);
    } else {
        value = evaluate(this.top, this.randomer, this.instruction.expression);
        this.top.set(this.instruction.variable, value + this.instruction.value);
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
    // istanbul ignore if
    if (this.debug) {
        console.log(this.top.at() + '/' + this.label + ' ' + value + ' -> ' + next);
    }
    return this.goto(next);
};

Engine.prototype.$ask = function $ask() {
    this.prompt();
    return false;
};

Engine.prototype.goto = function _goto(label) {
    while (label == null && this.stack.length > 1) {
        var top = this.stack.pop();
        if (top.stopOption) {
            this.render.stopOption();
        }
        this.top = this.stack[this.stack.length - 1];
        label = top.next;
    }
    if (label == null) {
        return this.end();
    }
    var next = this.story[label];
    // istanbul ignore if
    if (!next) {
        throw new Error('Story missing instruction for label: ' + label);
    }
    this.label = label;
    this.instruction = next;
    return true;
};

Engine.prototype.answer = function answer(text) {
    this.render.flush();
    if (text === 'quit') {
        this.dialog.close();
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
        // There is no known case where gothrough would immediately exit for
        // lack of further instructions, so
        // istanbul ignore else
        if (this.gothrough(this.options[n - 1].answer, null, false)) {
            this.flush();
            this.continue();
        }
    } else {
        this.render.pardon();
        this.prompt();
    }
};

Engine.prototype.gothrough = function gothrough(sequence, next, stopOption) {
    var prev = this.label;
    for (var i = sequence.length -1; i >= 0; i--) {
        // Note that we pass the top frame as both the parent scope and the
        // caller scope so that the entire sequence has the same variable
        // visibility.
        this.top = new Frame(this.top, this.top, [], next, prev, stopOption);
        this.stack.push(this.top);
        prev = next;
        next = sequence[i];
        stopOption = false;
    }
    return this.goto(next);
};

Engine.prototype.display = function display() {
    this.render.display();
};

Engine.prototype.prompt = function prompt() {
    this.display();
    // this.continue();
    this.dialog.question();
};

Engine.prototype.flush = function flush() {
    this.options.length = 0;
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

// istanbul ignore next
Global.prototype.log = function log() {
    var globals = Object.keys(this.scope);
    globals.sort();
    for (var i = 0; i < globals.length; i++) {
        var name = globals[i];
        var value = this.scope[name];
        console.log(name + ' = ' + value);
    }
    console.log('');
};

// istanbul ignore next
Global.prototype.at = function at() {
    return '';
};

function Frame(parent, caller, locals, next, branch, stopOption) {
    this.locals = locals;
    this.scope = Object.create(null);
    for (var i = 0; i < locals.length; i++) {
        this.scope[locals[i]] = 0;
    }
    this.parent = parent;
    this.caller = caller;
    this.next = next;
    this.branch = branch;
    this.stopOption = stopOption;
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

// istanbul ignore next
Frame.prototype.log = function log() {
    this.parent.log();
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
