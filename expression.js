'use strict';

var Variable = require('./variable');

module.exports = expression;

var unary = {
    '!': true,
    '-': true,
    '~': true,
    '#': true
};

var multiplicative = {
    '*': true,
    '/': true,
    '%': true,
    '~': true,
};

var arithmetic = {
    '+': true,
    '-': true,
};

var comparison = {
    '<': true,
    '<=': true,
    '==': true,
    '!=': true,
    '>=': true,
    '>': true,
    '#': true
};

var intersection = {
    'and': true
};

var union = {
    'or': true
};

var precedence = [
    multiplicative,
    arithmetic,
    comparison,
    intersection,
    union
];

function expression(story, parent) {
    for (var i = precedence.length - 1; i >= 0; i--) {
        var operators = precedence[i];
        parent = new BinaryExpression(story, operators, parent);
    }
    return new Unary(story, parent);
}

expression.variable = variable;
function variable(story, parent) {
    return new Variable.GetStaticVariable(story, parent, [], [], '', true);
}

var inversions = {
    '==': '!=',
    '!=': '==',
    '>': '<=',
    '<': '>=',
    '>=': '<',
    '<=': '>'
};

expression.invert = invert;
function invert(expression) {
    return [inversions[expression[0]], expression[1], expression[2]];
}

function Open(story, parent) {
    this.type = 'parenthetical-expression';
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Open.prototype.return = function _return(expression, scanner) {
    return new Close(this.story, this.parent, expression);
};

function Close(story, parent, expression) {
    this.type = 'end-of-expression';
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
}

Close.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'symbol' && text === ')') {
        return this.parent.return(this.expression, scanner);
    } else {
        this.story.error('Expected parenthetical expression to end with ) or continue with operator, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(this.expression);
    }
};

function Value(story, parent) {
    this.type = 'expect-value';
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Value.prototype.next = function next(type, space, text, scanner) {
    if (type === 'number') {
        return this.parent.return(['val', +text], scanner);
    } else if (text === '(') {
        return expression(this.story, new Open(this.story, this.parent));
    } else if (text === '$') {
        return new Variable.GetDynamicVariable(this.story, this.parent, [''], []);
    // istanbul ignore else
    } else if (type === 'alphanum') {
        return new Variable.GetStaticVariable(this.story, this.parent, [], [], text, false);
    } else {
        this.story.error('Expected expression, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(['val', 0]).next(type, space, text, scanner);
    }
};

function Unary(story, parent) {
    this.type = 'unary-expression';
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Unary.prototype.next = function next(type, space, text, scanner) {
    if (unary[text] === true) {
        return new Unary(this.story,
            new UnaryOperator(this.story, this.parent, text));
    } else {
        return new Value(this.story, this.parent)
            .next(type, space, text, scanner);
    }
};

function UnaryOperator(story, parent, op) {
    this.story = story;
    this.parent = parent;
    this.op = op;
}

UnaryOperator.prototype.return = function _return(expression, scanner) {
    return this.parent.return([this.op, expression]);
};

function MaybeOperator(story, parent, expression, operators) {
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    this.operators = operators;
    Object.seal(this);
}

MaybeOperator.prototype.next = function next(type, space, text, scanner) {
    if (this.operators[text] === true) {
        return new Unary(this.story,
            this.maybeAnother(new PartialExpression(this.story, this, text, this.expression)));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

MaybeOperator.prototype.maybeAnother = function maybeAnother(expression) {
    for (var i = 0; i < precedence.length; i++) {
        var operators = precedence[i];
        expression = new BinaryExpression(this.story, operators, expression);
        if (operators === this.operators) {
            break;
        }
    }
    return expression;
};

function BinaryExpression(story, operators, parent) {
    this.story = story;
    this.parent = parent;
    this.operators = operators;
    Object.seal(this);
}

BinaryExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeOperator(this.story, this.parent, expression, this.operators);
};

function PartialExpression(story, parent, op, left) {
    this.story = story;
    this.parent = parent;
    this.op = op;
    this.left = left;
    Object.seal(this);
}

PartialExpression.prototype.return = function _return(right, scanner) {
    return this.parent.maybeAnother(this.parent.parent).return([this.op, this.left, right]);
};
