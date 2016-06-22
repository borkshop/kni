'use strict';

var equals = require('pop-equals');
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
Text.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.text === that.text &&
        this.lift === that.lift &&
        this.drop === that.drop &&
        this.next === that.next;
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
    return JSON.stringify(this.expression);
};
Print.prototype.equals = function _equals(that) {
    return this.type === that.type &&
        equals(this.expression, that.expression) &&
        this.next === that.next;
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
Option.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.label === that.label &&
        // Don't care about keywords for the nonce
        this.branch == that.branch &&
        this.next === that.next;
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
Goto.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.next === that.next;
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
Call.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.label === that.label &&
        this.branch === that.branch &&
        this.next === that.next;
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
Subroutine.prototype.equals = function _equals(that) {
    return this.type === that.type &&
        equals(this.locals, that.locals) &&
        this.next === that.next;
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
Jump.prototype.equals = function _equals(that) {
    return this.type === that.type &&
        equals(this.condition, that.condition) &&
        this.branch === that.branch &&
        this.next === that.next;
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
    return JSON.stringify(this.expression) + ' ' + this.mode;
};
Switch.prototype.equals = function _equals(that) {
    return this.type === that.type &&
        equals(this.expression, that.expression) &&
        this.value === that.value &&
        this.mode === that.mode &&
        equals(this.branches, that.branches);
};

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
// istanbul ignore next
Set.prototype.describe = function describe() {
    return this.variable + ' ' + JSON.stringify(this.expression);
};
Set.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.variable === that.variable &&
        this.parameter === Boolean(that.parameter) &&
        this.next === that.next;
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
Break.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.next === that.next;
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
Paragraph.prototype.equals = function equals(that) {
    return this.type === that.type &&
        this.next === that.next;
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
Prompt.prototype.equals = function equals(that) {
    return this.type === that.type;
};

function tie(end) {
    this.next = end;
}
