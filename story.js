'use strict';

var Path = require('./path');
var constructors = {};

module.exports = Story;

function Story() {
    this.states = {};
    Object.seal(this);
}

Story.constructors = constructors;

Story.prototype.create = function create(path, type, text) {
    var name = Path.toName(path);
    var Node = constructors[type];
    // istanbul ignore if
    if (!Node) {
        throw new Error('No node constructor for type: ' + type);
    }
    var node = new Node(text);
    this.states[name] = node;
    return node;
};

// istanbul ignore next
Story.prototype.dot = function dot() {
    return 'graph {}';
};

constructors.text = Text;
function Text(text) {
    this.type = 'text';
    this.text = text;
    this.lift = ' ';
    this.drop = ' ';
    this.next = null;
    Object.seal(this);
}
Text.prototype.tie = tie;
// istanbul ignore next
Text.prototype.describe = function describe() {
    return this.text;
};

constructors.print = Print;
function Print(variable) {
    this.type = 'print';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Print.prototype.tie = tie;
// istanbul ignore next
Print.prototype.describe = function describe() {
    return this.variable;
};

constructors.option = Option;
function Option(label) {
    this.type = 'option';
    this.label = label;
    this.keywords = [];
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Option.prototype.tie = tie;
// istanbul ignore next
Option.prototype.describe = function describe() {
    return this.label + ' -> ' + this.branch;
};

constructors.goto = Goto;
function Goto(next) {
    this.type = 'goto';
    this.next = next || null;
    Object.seal(this);
}
Goto.prototype.tie = tie;
// istanbul ignore next
Goto.prototype.describe = function describe() {
    return this.next;
};

constructors.call = Call;
function Call(label) {
    this.type = 'call';
    this.label = label;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Call.prototype.tie = tie;
// istanbul ignore next
Call.prototype.describe = function describe() {
    return this.branch + '() -> ' + this.next;
};

constructors.subroutine = Subroutine;
function Subroutine(locals) {
    this.type = 'subroutine';
    this.locals = locals;
    this.next = null;
    Object.seal(this);
};
Subroutine.prototype.tie = tie;
// istanbul ignore next
Subroutine.prototype.describe = function describe() {
    return '(' + this.locals.join(', ') + ')';
};

constructors.jz = Jz;
function Jz(variable) {
    this.type = 'jz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jz.prototype.tie = tie;
// istanbul ignore next
Jz.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jnz = Jnz;
function Jnz(variable) {
    this.type = 'jnz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jnz.prototype.tie = tie;
// istanbul ignore next
Jnz.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jeq = Jeq;
function Jeq(variable) {
    this.type = 'jeq';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jeq.prototype.tie = tie;
// istanbul ignore next
Jeq.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jne = Jne;
function Jne(variable) {
    this.type = 'jne';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jne.prototype.tie = tie;
// istanbul ignore next
Jne.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jlt = Jlt;
function Jlt(variable) {
    this.type = 'jlt';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jlt.prototype.tie = tie;
// istanbul ignore next
Jlt.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jgt = Jgt;
function Jgt(variable) {
    this.type = 'jgt';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jgt.prototype.tie = tie;
// istanbul ignore next
Jgt.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jle = Jle;
function Jle(variable) {
    this.type = 'jle';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jle.prototype.tie = tie;
// istanbul ignore next
Jle.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.jge = Jge;
function Jge(variable) {
    this.type = 'jge';
    this.variable = variable;
    this.value = 0;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jge.prototype.tie = tie;
// istanbul ignore next
Jge.prototype.describe = function describe() {
    return this.variable + ' ' + this.branch;
};

constructors.switch = Switch;
function Switch(variable) {
    this.type = 'switch';
    this.variable = variable;
    this.value = 0;
    this.mode = null;
    this.branches = [];
    Object.seal(this);
}
Switch.prototype.tie = tie;
// istanbul ignore next
Switch.prototype.describe = function describe() {
    return this.variable + ' ' + this.mode;
};

constructors.set = Set;
function Set(variable) {
    this.type = 'set';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Set.prototype.tie = tie;
// istanbul ignore next
Set.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.add = Add;
function Add(variable) {
    this.type = 'add';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Add.prototype.tie = tie;
// istanbul ignore next
Add.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.sub = Sub;
function Sub(variable) {
    this.type = 'sub';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Sub.prototype.tie = tie;
// istanbul ignore next
Sub.prototype.describe = function describe() {
    return this.variable + ' ' + this.value;
};

constructors.break = Break;
function Break(variable) {
    this.type = 'break';
    this.next = null;
    Object.seal(this);
}
Break.prototype.tie = tie;
// istanbul ignore next
Break.prototype.describe = function describe() {
    return '';
};

constructors.paragraph = Paragraph;
function Paragraph(variable) {
    this.type = 'paragraph';
    this.next = null;
    Object.seal(this);
}
Paragraph.prototype.tie = tie;
// istanbul ignore next
Paragraph.prototype.describe = function describe() {
    return '';
};

constructors.prompt = Prompt;
function Prompt(variable) {
    this.type = 'prompt';
    Object.seal(this);
}
Prompt.prototype.tie = tie;
// istanbul ignore next
Prompt.prototype.describe = function describe() {
    return '';
};

function tie(end) {
    this.next = end;
}
