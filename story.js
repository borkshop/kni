'use strict';

var Path = require('./path');

var constructors = {};

module.exports = Story;

function Story() {
    this.states = {};
    this.errors = [];
    Object.seal(this);
}

Story.constructors = constructors;

Story.prototype.create = function create(path, type, arg, position) {
    var name = Path.toName(path);
    var Node = constructors[type];
    // istanbul ignore if
    if (!Node) {
        throw new Error('No node constructor for type: ' + type);
    }
    var node = new Node(arg);
    node.position = position;
    this.states[name] = node;
    return node;
};

// istanbul ignore next
Story.prototype.error = function _error(error) {
    this.errors.push(error);
};

constructors.text = Text;
function Text(text) {
    this.type = 'text';
    this.text = text;
    this.lift = ' ';
    this.drop = ' ';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Text.prototype.tie = tie;

constructors.echo = Echo;
function Echo(expression) {
    this.type = 'echo';
    this.expression = expression;
    this.lift = '';
    this.drop = '';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Echo.prototype.tie = tie;

constructors.option = Option;
function Option(label) {
    this.type = 'opt';
    this.question = [];
    this.answer = [];
    this.keywords = null;
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Option.prototype.tie = tie;

constructors.goto = Goto;
function Goto(next) {
    this.type = 'goto';
    this.next = next || null;
    this.position = null;
    Object.seal(this);
}
Goto.prototype.tie = tie;

constructors.call = Call;
function Call(label) {
    this.type = 'call';
    this.label = label;
    this.args = null;
    this.next = 'END';
    this.branch = 'END';
    this.position = null;
    Object.seal(this);
}
Call.prototype.tie = tie;

constructors.def = Def;
function Def(locals) {
    this.type = 'def';
    this.locals = locals;
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Def.prototype.tie = tie;

constructors.jump = Jump;
function Jump(condition) {
    this.type = 'jump';
    this.condition = condition;
    this.branch = 'END';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Jump.prototype.tie = tie;

constructors.switch = Switch;
function Switch(expression) {
    this.type = 'switch';
    this.expression = expression;
    this.variable = null;
    this.value = 0;
    this.mode = null;
    this.branches = [];
    this.weights = [];
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Switch.prototype.tie = tie;

constructors.move = Move;
function Move() {
    this.type = 'move';
    this.source = null;
    this.target = null;
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Move.prototype.tie = tie;

constructors.break = Break;
function Break() {
    this.type = 'br';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Break.prototype.tie = tie;

constructors.paragraph = Paragraph;
function Paragraph() {
    this.type = 'par';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Paragraph.prototype.tie = tie;

constructors.rule = Rule;
function Rule() {
    this.type = 'rule';
    this.next = 'END';
    this.position = null;
    Object.seal(this);
}
Rule.prototype.tie = tie;

constructors.ask = Ask;
function Ask(variable) {
    this.type = 'ask';
    this.position = null;
    Object.seal(this);
}
Ask.prototype.tie = tie;

function tie(end) {
    this.next = end;
}
