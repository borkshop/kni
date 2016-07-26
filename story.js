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
Story.prototype.error = function _error(error) {
    this.errors.push(error);
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

constructors.echo = Echo;
function Echo(expression) {
    this.type = 'echo';
    this.expression = expression;
    this.lift = '';
    this.drop = '';
    this.next = null;
    Object.seal(this);
}
Echo.prototype.tie = tie;

constructors.option = Option;
function Option(label) {
    this.type = 'opt';
    this.question = [];
    this.answer = [];
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

constructors.apply = Apply;
function Apply(branch) {
    this.type = 'apply';
    this.branch = branch;
    this.args = null;
    this.next = null;
    Object.seal(this);
}
Apply.prototype.tie = tie;

constructors.args = Args;
function Args(locals) {
    this.type = 'args';
    this.locals = locals;
    this.next = null;
    Object.seal(this);
};
Args.prototype.tie = tie;

constructors.jump = Jump;
function Jump(condition) {
    this.type = 'jump';
    this.condition = condition;
    this.branch = null;
    this.next = null;
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
    this.next = null;
    Object.seal(this);
}
Switch.prototype.tie = tie;

constructors.set = Set;
function Set(variable) {
    this.type = 'set';
    this.variable = variable;
    this.expression = null;
    this.parameter = false;
    this.next = null;
    Object.seal(this);
}
Set.prototype.tie = tie;

constructors.mov = Mov;
function Mov() {
    this.type = 'mov';
    this.source = null;
    this.target = null;
    this.next = null;
    Object.seal(this);
}
Mov.prototype.tie = tie;

constructors.break = Break;
function Break() {
    this.type = 'br';
    this.next = null;
    Object.seal(this);
}
Break.prototype.tie = tie;

constructors.paragraph = Paragraph;
function Paragraph() {
    this.type = 'par';
    this.next = null;
    Object.seal(this);
}
Paragraph.prototype.tie = tie;

constructors.rule = Rule;
function Rule() {
    this.type = 'rule';
    this.next = null;
    Object.seal(this);
}
Rule.prototype.tie = tie;

constructors.prompt = Prompt;
function Prompt(variable) {
    this.type = 'ask';
    Object.seal(this);
}
Prompt.prototype.tie = tie;

function tie(end) {
    this.next = end;
}
