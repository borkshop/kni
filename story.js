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
function Print(expression) {
    this.type = 'print';
    this.expression = expression;
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

constructors.jump = Jump;
function Jump(condition) {
    this.type = 'jump';
    this.condition = condition;
    this.branch = null;
    this.next = null;
    Object.seal(this);
}
Jump.prototype.tie = tie;
// istanbul ignore next
Jump.prototype.describe = function describe() {
    return this.variable + ' ' + JSON.stingify(this.condition) + ' ' + this.branch;
};

constructors.switch = Switch;
function Switch(expression) {
    this.type = 'switch';
    this.expression = expression;
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
    this.expression = null;
    this.next = null;
    Object.seal(this);
}
Set.prototype.tie = tie;
// istanbul ignore next
Set.prototype.describe = function describe() {
    return this.variable + ' ' + JSON.stringify(this.expression);
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
