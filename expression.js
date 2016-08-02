'use strict';

module.exports = expression;

var unary = {
    'not': true,
    '-': true,
    '~': true,
    '#': true
};

var exponential = {
    '**': true // x ** y
};

var multiplicative = {
    '*': true,
    '/': true,
    '%': true,
    'rem': true,
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
    '<>': true,
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

var precedence = [ // from low to high
    union,
    intersection,
    comparison,
    arithmetic,
    multiplicative,
    exponential,
];

function expression(story, parent) {
    for (var i = 0; i < precedence.length; i++) {
        var operators = precedence[i];
        parent = new BinaryExpression(story, operators, parent);
    }
    return new Unary(story, parent);
}

expression.variable = variable;
function variable(story, parent) {
    return new GetStaticVariable(story, parent, [], [], '', true);
}

expression.label = label;
function label(story, parent) {
    return new GetStaticVariable(story, new AfterVariable(story, parent), [], [], '', true);
}

var inversions = {
    '==': '<>',
    '<>': '==',
    '>': '<=',
    '<': '>=',
    '>=': '<',
    '<=': '>'
};

expression.invert = invert;
function invert(expression) {
    if (expression[0] === 'not') {
        return expression[1];
    } else if (inversions[expression[0]]) {
        return [inversions[expression[0]], expression[1], expression[2]];
    } else {
        return ['not', expression];
    }
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
        return this.parent.return(this.expression, scanner);
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
    } else if (text === '{') {
        return expression(this.story, new GetDynamicVariable(this.story, this.parent, [''], []));
    // istanbul ignore else
    } else if (type === 'alphanum') {
        return new GetStaticVariable(this.story, new AfterVariable(this.story, this.parent), [], [], text, false);
    } else {
        this.story.error('Expected expression, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(['val', 0], scanner)
            .next(type, space, text, scanner);
    }
};

function AfterVariable(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

AfterVariable.prototype.return = function _return(expression, scanner) {
    return new MaybeCall(this.story, this.parent, expression);
};

function MaybeCall(story, parent, expression) {
    this.type = 'maybe-call';
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
}

MaybeCall.prototype.next = function next(type, space, text, scanner) {
    if (space === '' && text === '(') {
        return new Arguments(this.story, this.parent, this.expression);
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Arguments(story, parent, expression) {
    this.type = 'arguments';
    this.story = story;
    this.parent = parent;
    this.args = ['call', expression];
}

Arguments.prototype.next = function next(type, space, text, scanner) {
    if (text === ')') {
        return this.parent.return(this.args, scanner);
    } else {
        return expression(this.story, this)
            .next(type, space, text, scanner);
    }
};

Arguments.prototype.return = function _return(expression, scanner) {
    this.args.push(expression);
    return new MaybeArgument(this.story, this);
};

function MaybeArgument(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

MaybeArgument.prototype.next = function next(type, space, text, scanner) {
    if (text === ',') {
        return expression(this.story, this.parent);
    // istanbul ignore else
    } else  if (text === ')') {
        return this.parent.next(type, space, text, scanner);
    } else {
        this.story.error('Expected , or ) to end argument list, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent;
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
    this.type = 'unary-operator';
    this.story = story;
    this.parent = parent;
    this.op = op;
}

UnaryOperator.prototype.return = function _return(expression, scanner) {
    return this.parent.return([this.op, expression], scanner);
};

function MaybeOperator(story, parent, expression, operators) {
    this.type = 'maybe-operator';
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    this.operators = operators;
    Object.seal(this);
}

MaybeOperator.prototype.next = function next(type, space, text, scanner) {
    if (this.operators[text] === true) {
        var parent = new MaybeExpression(this.story, this.parent, this.operators);
        parent = new PartialExpression(this.story, parent, text, this.expression);
        for (var i = precedence.indexOf(this.operators) + 1; i < precedence.length; i++) {
            parent = new MaybeExpression(this.story, parent, precedence[i]);
        }
        return new Unary(this.story, parent);
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function MaybeExpression(story, parent, operators) {
    this.story = story;
    this.parent = parent;
    this.operators = operators;
    Object.seal(this);
}

MaybeExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeOperator(this.story, this.parent, expression, this.operators);
};

function PartialExpression(story, parent, operator, expression) {
    this.story = story;
    this.parent = parent;
    this.operator = operator;
    this.expression = expression;
}

PartialExpression.prototype.return = function _return(expression, scanner) {
    return this.parent.return([this.operator, this.expression, expression], scanner);
};

function BinaryExpression(story, operators, parent) {
    this.type = 'binary-expression';
    this.story = story;
    this.parent = parent;
    this.operators = operators;
    Object.seal(this);
}

BinaryExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeOperator(this.story, this.parent, expression, this.operators);
};

function GetDynamicVariable(story, parent, literals, expressions) {
    this.type = 'get-dynamic-variable';
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.expressions = expressions;
    Object.seal(this);
}

GetDynamicVariable.prototype.return = function _return(expression, scanner) {
    return new Expect('token', '}', this.story,
        new GetStaticVariable(this.story,
            this.parent,
            this.literals,
            this.expressions.concat([expression]),
            ''
        )
    );
};

function GetStaticVariable(story, parent, literals, expressions, literal, fresh) {
    this.type = 'static-variable';
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.expressions = expressions;
    this.literal = literal;
    this.fresh = fresh;
    Object.seal(this);
}

GetStaticVariable.prototype.next = function next(type, space, text, scanner) {
    if (type !== 'literal' && (space === '' || this.fresh)) {
        this.fresh = false;
        if (text === '{') {
            return expression(this.story, new GetDynamicVariable(
                this.story,
                this.parent,
                this.literals.concat([this.literal]),
                this.expressions
            ));
        } else if (text === '.') {
            this.literal += text;
            return this;
        } else if (type === 'alphanum' || type === 'number') {
            this.literal += text;
            return this;
        }
    }

    var state;
    if (this.literals.length === 0 && this.expressions.length === 0) {
        // istanbul ignore if
        if (this.literal === '') {
            this.story.error('Expected variable but got ' + type + '/' + text + ' at ' + scanner.position());
            state = this.parent.return([], scanner);
        } else {
            state = this.parent.return(['get', this.literal], scanner);
        }
    } else {
        state = this.parent.return(['var', this.literals.concat([this.literal]), this.expressions], scanner);
    }
    return state.next(type, space, text, scanner);
};

function Expect(type, text, story, parent) {
    this.type = 'expect';
    this.expect = type;
    this.text = text;
    this.story = story;
    this.parent = parent;
}

Expect.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === this.expect && text === this.text) {
        return this.parent;
    } else {
        this.story.error('Expected ' + this.expect + ' ' + this.text + ', got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent;
    }
};
