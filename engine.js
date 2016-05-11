'use strict';

var readline = require('readline');

module.exports = ReadlineEngine;

var debug = process.env.DEBUG_READLINE_ENGINE;

function ReadlineEngine(story, start) {
    var self = this;
    this.story = story;
    this.blocks = [[]];
    this.options = [];
    this.keywords = {};
    this.variables = {};
    this.instruction = {type: 'goto', label: start || 'start'};
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
            console.log(this.instruction);
        }
        if (!this['$' + this.instruction.type]) {
            throw new Error('Unexpected instruction type: ' + this.instruction.type);
        }
        _continue = this['$' + this.instruction.type](this.instruction);
    } while (_continue);
};

ReadlineEngine.prototype.$end = function end() {
    this.display();
    this.readline.close();
    return false;
};

ReadlineEngine.prototype.$text = function text() {
    this.blocks[this.blocks.length - 1].push(this.instruction.text);
    this.goto(this.instruction.next);
    return true;
};

ReadlineEngine.prototype.$break = function $break() {
    this.blocks.push([]);
    this.goto(this.instruction.next);
    return true;
};

ReadlineEngine.prototype.$goto = function $goto() {
    this.goto(this.instruction.label);
    return true;
};

ReadlineEngine.prototype.$option = function option() {
    this.options.push(this.instruction);
    for (var i = 0; i < this.instruction.keywords.length; i++) {
        var keyword = this.instruction.keywords[i];
        this.keywords[keyword] = this.instruction.branch;
    }
    this.goto(this.instruction.next);
    return true;
};

ReadlineEngine.prototype.$prompt = function prompt() {
    this.prompt();
    return false;
};

ReadlineEngine.prototype.$inc = function inc() {
    if (this.variables[this.instruction.variable] == null) {
        this.variables[this.instruction.variable] = 0;
    }
    this.variables[this.instruction.variable]++;
    this.goto(this.instruction.next);
    return true;
};

ReadlineEngine.prototype.$jnz = function jnz() {
    if (this.debug) {
        console.log('JNZ', this.instruction.variable, this.variables[this.instruction.variable]);
    }
    if (this.variables[this.instruction.variable]) {
        this.goto(this.instruction.branch);
    } else {
        this.goto(this.instruction.next);
    }
    return true;
};

ReadlineEngine.prototype.goto = function _goto(label) {
    if (this.debug) {
        console.log('GOTO', label);
    }
    var next = this.story[label];
    if (!next) {
        throw new Error('Story missing knot for label: ' + label);
    }
    this.instruction = next;
};

ReadlineEngine.prototype.command = function command(command) {
    if (command === 'quit') {
        this.readline.close();
    }
    console.log('');
    var n = +command;
    if (n >= 1 && n <= this.options.length) {
        this.instruction = this.story[this.options[n - 1].branch];
        this.flush();
    } else if (this.keywords[command]) {
        this.instruction = this.story[this.keywords[command]];
        this.flush();
    } else {
        console.log('?');
        this.prompt();
    }
};

ReadlineEngine.prototype.display = function display() {
    var blocks = this.blocks.filter(getLength);
    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        // TODO line wrap at min of termios width or 60
        console.log(block.join(' '));
    }
};

function getLength(array) {
    return array.length;
}

ReadlineEngine.prototype.prompt = function prompt() {
    this.display();
    for (var i = 0; i < this.options.length; i++) {
        var option = this.options[i];
        console.log((i + 1) + '. ' + option.label);
    }
    this.readline.question('> ', this.boundCommand);
};

ReadlineEngine.prototype.flush = function flush() {
    this.options.length = 0;
    this.keywords = {};
    this.blocks = [[]];
    this.continue();
};

function main() {
    var story = require('./hello.json');
    var engine = new ReadlineEngine(story);
    engine.continue();
}

if (require.main === module) {
    main();
}
