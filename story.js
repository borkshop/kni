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
    this.next = null;
    Object.seal(this);
}
Text.prototype.tie = tie;

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
    this.next = next;
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

constructors.inc = Inc;
function Inc(variable) {
    this.type = 'inc';
    this.variable = variable;
    this.next = null;
    Object.seal(this);
}
Inc.prototype.tie = tie;

constructors.sequence = Sequence;
function Sequence(variable) {
    this.type = 'sequence';
    this.variable = variable;
    this.branches = [];
    Object.seal(this);
}
Sequence.prototype.tie = tie;

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

function tie(end) {
    this.next = end;
}
