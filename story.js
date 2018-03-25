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
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.echo = Echo;
function Echo(expression) {
    this.type = 'echo';
    this.expression = expression;
    this.lift = '';
    this.drop = '';
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.option = Option;
function Option(label) {
    this.type = 'opt';
    this.question = [];
    this.answer = [];
    this.keywords = null;
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.goto = Goto;
function Goto(next) {
    this.type = 'goto';
    this.next = next;
    this.position = null;
    Object.seal(this);
}

constructors.call = Call;
function Call(label) {
    this.type = 'call';
    this.label = label;
    this.args = null;
    this.next = 'RET';
    this.branch = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.cue = Cue;
function Cue(cue) {
    this.type = 'cue';
    this.cue = cue;
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.def = Def;
function Def(locals) {
    this.type = 'def';
    this.locals = locals;
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.jump = Jump;
function Jump(condition) {
    this.type = 'jump';
    this.condition = condition;
    this.branch = 'RET';
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.switch = Switch;
function Switch(expression) {
    this.type = 'switch';
    this.expression = expression;
    this.variable = null;
    this.value = 0;
    this.mode = null;
    this.branches = [];
    this.weights = [];
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.move = Move;
function Move() {
    this.type = 'move';
    this.source = null;
    this.target = null;
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.break = Break;
function Break() {
    this.type = 'br';
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.paragraph = Paragraph;
function Paragraph() {
    this.type = 'par';
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.rule = Rule;
function Rule() {
    this.type = 'rule';
    this.next = 'RET';
    this.position = null;
    Object.seal(this);
}

constructors.ask = Ask;
function Ask(variable) {
    this.type = 'ask';
    this.position = null;
    Object.seal(this);
}
