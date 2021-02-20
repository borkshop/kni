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
