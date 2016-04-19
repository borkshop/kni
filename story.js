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
    if (!Node) {
        throw new Error('No node constructor for type: ' + type);
    }
    var node = new Node(text);
    this.states[name] = node;
    return node;
};

constructors.text = Text;
function Text(text) {
    this.type = 'text';
    this.text = text;
    this.next = null;
    Object.seal(this);
}

Text.prototype.tie = tie;

constructors.break = Break;
function Break() {
    this.type = 'break';
    this.next = null;
    Object.seal(this);
}

Break.prototype.tie = tie;

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

constructors.prompt = Prompt;
function Prompt() {
    this.type = 'prompt';
    Object.seal(this);
}

Prompt.prototype.tie = tie;

constructors.goto = Goto;
function Goto(label) {
    this.type = 'goto';
    this.label = label;
    Object.seal(this);
}

Goto.prototype.tie = tie;

constructors.end = End;
function End() {
    this.type = 'end';
    Object.seal(this);
}

End.prototype.tie = tie;

function tie(end) {
    this.next = end;
}
