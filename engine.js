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
    this.handler = args.handler;
    this.options = [];
    this.keywords = {};
    this.noOption = null;
    this.global = new Global(this.handler);
    this.top = this.global;
    this.stack = [this.top];
    this.label = '';
    // istanbul ignore next
    var start = args.start || 'start';
    this.instruction = new Story.constructors.goto(start);
    this.render = args.render;
    this.dialog = args.dialog;
    this.dialog.engine = this;
    // istanbul ignore next
    this.randomer = args.randomer || Math;
    this.debug = debug;
    this.waypoint = null;
    Object.seal(this);
}

Engine.prototype.continue = function _continue() {
    var _continue;
    do {
        // istanbul ignore if
        if (this.debug) {
            console.log(this.label + ' ' +  this.instruction.type + ' ' + describe(this.instruction));
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

Engine.prototype.gothrough = function gothrough(sequence, next, stopOption) {
    var prev = this.label;
    for (var i = sequence.length -1; i >= 0; i--) {
        // Note that we pass the top frame as both the parent scope and the
        // caller scope so that the entire sequence has the same variable
        // visibility.
        if (next) {
            this.top = new Frame(this.top, this.top, [], next, prev, stopOption);
            this.stack.push(this.top);
        }
        prev = next;
        next = sequence[i];
        stopOption = false;
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
        var answer = this.noOption.answer;
        this.flush();
        this.gothrough(answer, null, false);
        this.continue();
    } else {
        return this.goto(this.instruction.next);
    }
};

Engine.prototype.answer = function answer(text) {
    if (this.handler && this.handler.answer) {
        this.handler.answer(text, this);
    }
    this.render.flush();
    var choice = text - 1;
    if (choice >= 0 && choice < this.options.length) {
        return this.choice(this.options[choice].answer);
    } else if (this.keywords[text]) {
        return this.choice(this.keywords[text].answer);
    } else {
        this.render.pardon();
        this.ask();
    }
};

Engine.prototype.choice = function choice(answer) {
    this.render.clear();
    this.waypoint = this.capture(answer);
    if (this.handler && this.handler.waypoint) {
        this.handler.waypoint(this.waypoint, this);
    }
    // There is no known case where gothrough would immediately exit for
    // lack of further instructions, so
    // istanbul ignore else
    if (this.gothrough(answer, null, false)) {
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
Engine.prototype.capture = function capture(answer) {
    var stack = [];
    var top = this.top;
    while (top !== this.global) {
        stack.unshift(top.capture());
        top = top.parent;
    }
    return [
        this.label || "",
        answer,
        stack,
        this.global.capture(),
        [
            this.randomer._state0U,
            this.randomer._state0L,
            this.randomer._state1U,
            this.randomer._state1L
        ]
    ];
};

// istanbul ignore next
Engine.prototype.resume = function resume(state) {
    this.render.clear();
    this.flush();
    this.label = '';
    this.global = new Global(this.handler);
    this.top = this.global;
    this.stack = [this.top];
    if (state == null) {
        if (this.handler && this.handler.waypoint) {
            this.handler.waypoint(null, this);
        }
        this.goto('start');
        this.continue();
        return;
    }

    this.label = state[0];
    var answer = state[1];
    var stack = state[2];
    for (var i = 0; i < stack.length; i++) {
        this.top = Frame.resume(this.top, this.global, stack[i]);
        this.stack.push(this.top);
    }
    var global = state[3];
    var keys = global[0];
    var values = global[1];
    for (var i = 0; i < keys.length; i++) {
        this.global.set(keys[i], values[i]);
    }
    var random = state[4];
    this.randomer._state0U = random[0];
    this.randomer._state0L = random[1];
    this.randomer._state1U = random[2];
    this.randomer._state1L = random[3];
    if (answer == null) {
        this.flush();
        this.continue();
    } else if (this.gothrough(answer, null, false)) {
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
    var procedure = this.story[this.instruction.branch];
    // istanbul ignore if
    if (!procedure) {
        console.error('no such procedure ' + this.instruction.branch, this.instruction);
        return this.resume();
    }
    // istanbul ignore if
    if (procedure.type !== 'args') {
        console.error('Can\'t call non-procedure ' + this.instruction.branch, this.instruction);
        return this.resume();
    }
    // istanbul ignore if
    if (procedure.locals.length !== this.instruction.args.length) {
        console.error('Argument length mismatch for ' + this.instruction.branch, this.instruction, procedure);
        return this.resume();
    }
    // TODO replace this.global with closure scope if scoped procedures become
    // viable. This will require that the engine create references to closures
    // when entering a new scope (calling a procedure), in addition to
    // capturing locals. As such the parser will need to retain a reference to
    // the enclosing procedure and note all of the child procedures as they are
    // encountered.
    this.top = new Frame(this.top, this.global, procedure.locals, this.instruction.next, this.label);
    if (this.instruction.next) {
        this.stack.push(this.top);
    }
    for (var i = 0; i < this.instruction.args.length; i++) {
        var arg = this.instruction.args[i];
        var value = evaluate(this.top.parent, this.randomer, arg);
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
    for (var i = 0; i < option.keywords.length; i++) {
        var keyword = option.keywords[i];
        // The first option to introduce a keyword wins, not the last.
        if (!this.keywords[keyword]) {
            this.keywords[keyword] = option;
        }
    }
    if (option.question.length) {
        this.options.push(option);
        this.render.startOption();
        return this.gothrough(option.question, this.instruction.next, true);
    } else if (this.noOption == null) {
        this.noOption = option;
    }
    return this.goto(option.next);
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
    return this.gothrough(nexts, this.instruction.next, false);
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

function Global(handler) {
    this.scope = Object.create(null);
    this.handler = handler;
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

// istanbul ignore next
Global.prototype.capture = function capture() {
    var names = Object.keys(this.scope);
    var values = [];
    for (var i = 0; i < names.length; i++) {
        values[i] = this.scope[names[i]] || 0;
    }
    return [
        names,
        values
    ];
};

// TODO names of parent and caller are not right, might be swapped.
// parent should be the scope parent for upchain lookups.
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
    this.stopOption = stopOption || false;
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

// istanbul ignore next
Frame.prototype.capture = function capture() {
    var values = [];
    // var object = {};
    for (var i = 0; i < this.locals.length; i++) {
        var local = this.locals[i];
        values.push(this.scope[local] || 0);
    }
    return [
        this.locals,
        values,
        this.next || "",
        this.branch || "",
        +(this.caller === this.top),
        +this.stopOption
    ];
};

// istanbul ignore next
Frame.resume = function resume(top, global, state) {
    var keys = state[0];
    var values = state[1];
    var next = state[2];
    var branch = state[3];
    var dynamic = state[4];
    var stopOption = state[5];
    top = new Frame(
        top,
        dynamic ? top : global,
        keys,
        next,
        branch,
        !!stopOption
    );
    for (var i = 0; i < keys.length; i++) {
        top.set(keys[i], values[i]);
    }
    return top;
};
