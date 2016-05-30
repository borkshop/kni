'use strict';

var readline = require('readline');
var Excerpt = require('./excerpt');
var Wrapper = require('./wrapper');

module.exports = ReadlineEngine;

var debug = process.env.DEBUG_READLINE_ENGINE;

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

function ReadlineEngine(story, start) {
    var self = this;
    this.story = story;
    this.options = [];
    this.keywords = {};
    this.variables = {};
    this.top = new Global();
    this.stack = [this.top];
    this.instruction = {type: 'goto', next: start || 'start'};
    this.wrapper = new Wrapper(process.stdout);
    this.excerpt = new Excerpt();
    this.query = new Excerpt();
    this.readline = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    this.debug = debug;
    this.boundCommand = command;
    function command(answer) {
        self.command(answer);
    }
}

ReadlineEngine.prototype.continue = function _continue() {
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

ReadlineEngine.prototype.print = function print(text) {
    // Implicitly prompt if there are pending options before resuming the
    // narrative.
    if (this.options.length) {
        this.prompt();
        return false;
    }
    this.excerpt.digest(this.instruction.lift, text, this.instruction.drop);
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$text = function text() {
    return this.print(this.instruction.text);
};

ReadlineEngine.prototype.$print = function print() {
    return this.print('' + this.read());
};

ReadlineEngine.prototype.$break = function $break() {
    this.excerpt.break();
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$paragraph = function $paragraph() {
    this.excerpt.paragraph();
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$goto = function $goto() {
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$call = function $call() {
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

ReadlineEngine.prototype.$subroutine = function $subroutine() {
    // Subroutines exist as targets for labels as well as for reference to
    // locals in calls.
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$option = function option() {
    this.options.push(this.instruction);
    for (var i = 0; i < this.instruction.keywords.length; i++) {
        var keyword = this.instruction.keywords[i];
        this.keywords[keyword] = this.instruction.branch;
    }
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$inc = function inc() {
    this.write(this.read() + 1);
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$set = function set() {
    this.write(this.instruction.value);
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$add = function add() {
    this.write(this.read() + this.instruction.value);
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$sub = function sub() {
    this.write(this.read() - this.instruction.value);
    return this.goto(this.instruction.next);
};

ReadlineEngine.prototype.$jz = function jz() {
    if (this.debug) {
        console.log('JZ', this.instruction.variable, this.read());
    }
    if (!this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

ReadlineEngine.prototype.$jnz = function jnz() {
    if (this.debug) {
        console.log('JNZ', this.instruction.variable, this.read());
    }
    if (this.read()) {
        return this.goto(this.instruction.branch);
    } else {
        return this.goto(this.instruction.next);
    }
};

ReadlineEngine.prototype.$jlt = function jlt() {
    if (this.read() < this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

ReadlineEngine.prototype.$jgt = function jgt() {
    if (this.read() > this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

ReadlineEngine.prototype.$jge = function jge() {
    if (this.read() >= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

ReadlineEngine.prototype.$jle = function jle() {
    if (this.read() <= this.instruction.value) {
        return this.goto(this.instruction.next);
    } else {
        return this.goto(this.instruction.branch);
    }
};

ReadlineEngine.prototype.$switch = function _switch() {
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

ReadlineEngine.prototype.$prompt = function prompt() {
    this.prompt();
    return false;
};

ReadlineEngine.prototype.goto = function _goto(name, fresh) {
    if (this.debug) {
        console.log('GO TO', name);
    }
    if (name === null) {
        if (this.debug) {
            console.log('STACK', this.stack.map(getNext).join(', '), 'OPTIONS', this.options.length);
        }
        if (this.stack.length > 1 && this.options.length === 0) {
            this.top = this.stack.pop();
            name = this.top.next;
            if (this.debug) {
                console.log('POP', 'GO TO', name);
            }
        } else if (this.options.length && !fresh) {
            this.prompt();
            return false;
        } else {
            this.display();
            console.log('');
            this.readline.close();
            return false;
        }
    }
    if (this.debug) {
        console.log('GOING TO', name);
    }
    var next = this.story[name];
    if (!next) {
        throw new Error('Story missing knot for name: ' + name);
    }
    this.instruction = next;
    return true;
};

function getNext(frame) {
    return frame.next;
}

ReadlineEngine.prototype.read = function read() {
    var variable = this.instruction.variable;
    if (this.variables[variable] == undefined) {
        this.variables[variable] = 0;
    }
    return this.variables[variable];
};

ReadlineEngine.prototype.write = function write(value) {
    var variable = this.instruction.variable;
    this.variables[variable] = value;
};

ReadlineEngine.prototype.command = function command(command) {
    console.log('');
    if (command === 'quit') {
        this.readline.close();
        return;
    }
    var n = +command;
    if (n >= 1 && n <= this.options.length) {
        if (this.goto(this.options[n - 1].branch, true)) {
            this.flush();
            this.continue();
        }
    } else if (this.keywords[command]) {
        if (this.goto(this.keywords[command], true)) {
            this.flush();
            this.continue();
        }
    } else {
        console.log('?');
        this.prompt();
    }
};

ReadlineEngine.prototype.display = function display() {
    this.excerpt.write(this.wrapper);
};

function getLength(array) {
    return array.length;
}

ReadlineEngine.prototype.prompt = function prompt() {
    this.display();
    for (var i = 0; i < this.options.length; i++) {
        var option = this.options[i];
        var lead = ((i + 1) + '.    ').slice(0, 4);
        this.wrapper.word(lead);
        this.wrapper.flush = true;
        this.wrapper.push('    ', '   ');
        this.wrapper.words(option.label);
        this.wrapper.pop();
        this.wrapper.break();
    }
    this.readline.question('> ', this.boundCommand);
};

ReadlineEngine.prototype.flush = function flush() {
    this.options.length = 0;
    this.keywords = {};
    this.excerpt = new Excerpt();
};

function main() {
    var story = require('./hello.json');
    var engine = new ReadlineEngine(story);
    engine.continue();
}

if (require.main === module) {
    main();
}
