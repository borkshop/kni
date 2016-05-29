'use strict';

var Path = require('./path');
var constructors = {};

module.exports = Story;

function Story() {
    this.states = {};
    Object.seal(this);
}

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

constructors.print = Print;
function Print(variable) {
    this.type = 'print';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Print.prototype.tie = tie;

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

constructors.goto = Goto;
function Goto(next) {
    this.type = 'goto';
    this.next = next || null;
    Object.seal(this);
}
Goto.prototype.tie = tie;

constructors.jz = Jz;
function Jz(variable) {
    this.type = 'jz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jz.prototype.tie = tie;

constructors.jnz = Jnz;
function Jnz(variable) {
    this.type = 'jnz';
    this.variable = variable;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jnz.prototype.tie = tie;

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

constructors.inc = Inc;
function Inc(variable) {
    this.type = 'inc';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Inc.prototype.tie = tie;

constructors.switch = Switch;
function Switch(variable) {
    this.type = 'switch';
    this.variable = variable;
    this.branches = [];
    this.value = 0;
    Object.seal(this);
}
Switch.prototype.tie = tie;

constructors.set = Set;
function Set(variable) {
    this.type = 'set';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Set.prototype.tie = tie;

constructors.add = Add;
function Add(variable) {
    this.type = 'add';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Add.prototype.tie = tie;

constructors.sub = Sub;
function Sub(variable) {
    this.type = 'sub';
    this.variable = variable;
    this.value = null;
    this.next = null;
    Object.seal(this);
}
Sub.prototype.tie = tie;

constructors.break = Break;
function Break(variable) {
    this.type = 'break';
    this.next = null;
    Object.seal(this);
}
Break.prototype.tie = tie;

constructors.prompt = Prompt;
function Prompt(variable) {
    this.type = 'prompt';
    Object.seal(this);
}
Break.prototype.tie = tie;

function tie(end) {
    this.next = end;
}
