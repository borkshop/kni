'use strict';

module.exports = expression;

function expression(story, parent) {
    return new Unary(story,
        new MultiplicativeExpression(story,
            new ArithmeticExpression(story,
                new ComparisonExpression(story, parent))));
}

function parenthesized(story, parent) {
    return expression(story, new Open(story, parent));
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
    // if (expression[0] === '!') {
    //     return expression[1];
    // if (inversions[expression[0]]) {
        return [inversions[expression[0]], expression[1], expression[2]];
    // } else {
    //     return ['!', expression];
    // }
}

function Open(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Open.prototype.type = 'parenthetical-expression';

Open.prototype.return = function _return(expression, scanner) {
    return new Close(this.story, this.parent, expression);
};

function Close(story, parent, expression) {
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
}

Close.prototype.type = 'end-of-expression';

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
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Value.prototype.type = 'expect-value';

Value.prototype.next = function next(type, space, text, scanner) {
    if (type === 'number') {
        return this.parent.return(['val', +text], scanner);
    } else if (text === '(') {
        return parenthesized(this.story, this.parent);
    } else if (text === '$') {
        return new GetDynamicVariable(this.story, this.parent, [''], []);
    // istanbul ignore else
    } else if (type === 'alphanum') {
        return new GetStaticVariable(this.story, this.parent, [], [], text, false);
    } else {
        this.story.error('Expected expression, got ' + type + '/' + text + ' at ' + scanner.position());
        return this.parent.return(['val', 0]).next(type, space, text, scanner);
    }
};

function Unary(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

Unary.prototype.type = 'unary-expression';

Unary.prototype.next = function next(type, space, text, scanner) {
    if (text === '!' || text === '-' || text === '~' || text === '#') {
        return new Value(this.story, new UnaryOperator(this.story, this.parent, text));
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

expression.variable = variable;
function variable(story, parent) {
    return new GetStaticVariable(story, parent, [], [], '', true);
}

function GetDynamicVariable(story, parent, literals, variables) {
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.variable = '';
    Object.seal(this);
}

GetDynamicVariable.prototype.type = 'dynamic-variable';

GetDynamicVariable.prototype.next = function next(type, space, text, scanner) {
    if ((type ===  'alphanum' || type === 'number') && space === '') {
        this.variable += text;
        return this;
    }
    return new GetStaticVariable(this.story, this.parent, this.literals, this.variables.concat([this.variable]), '')
        .next(type, space, text, scanner);
};

function GetStaticVariable(story, parent, literals, variables, literal, fresh) {
    this.story = story;
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.literal = literal;
    this.fresh = fresh;
    Object.seal(this);
}

GetStaticVariable.prototype.type = 'static-variable';

GetStaticVariable.prototype.next = function next(type, space, text, scanner) {
    if (space === '' || this.fresh) {
        this.fresh = false;
        if (text === '$') {
            return new GetDynamicVariable(
                this.story,
                this.parent,
                this.literals.concat([this.literal]),
                this.variables
            );
        } else if (text === '.') {
            this.literal += text;
            return this;
        } else if (type === 'alphanum' || type === 'number') {
            this.literal += text;
            return this;
        }
    }

    var state;
    if (this.literals.length === 0 && this.variables.length === 0) {
        // istanbul ignore if
        if (this.literal === '') {
            this.story.error('Expected variable but got ' + type + '/' + text + ' at ' + scanner.position());
            state = this.parent.return([], scanner);
        } else {
            state = this.parent.return(['get', this.literal], scanner);
        }
    } else {
        state = this.parent.return(['var', this.literals.concat([this.literal]), this.variables], scanner);
    }
    return state.next(type, space, text, scanner);
};

function MultiplicativeExpression(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

MultiplicativeExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeMultiplicative(this.story, this.parent, expression);
};

function MaybeMultiplicative(story, parent, expression) {
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
}

MaybeMultiplicative.prototype.type = 'multiplicative-expression';

MaybeMultiplicative.prototype.next = function next(type, space, text, scanner) {
    if (text === '*' || text === '/' || text === '%' || text === '~' || text === '^') {
        return new Unary(this.story,
            new Multiplicative(this.story, this.parent, text, this.expression));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Multiplicative(story, parent, op, left) {
    this.story = story;
    this.parent = parent;
    this.op = op;
    this.left = left;
    Object.seal(this);
}

Multiplicative.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(this.story, this.parent, [this.op, this.left, right]);
};

function ArithmeticExpression(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

ArithmeticExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeArithmetic(this.story, this.parent, expression);
};

function MaybeArithmetic(story, parent, expression) {
    this.story = story;
    this.parent = parent;
    this.expression = expression;
}

MaybeArithmetic.prototype.type = 'arithmetic-expression';

MaybeArithmetic.prototype.next = function next(type, space, text, scanner) {
    if (text === '+' || text === '-' || text === 'v') {
        return new Unary(this.story,
            new MultiplicativeExpression(this.story,
                new Arithmetic(this.story, this.parent, text, this.expression)));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Arithmetic(story, parent, op, left) {
    this.story = story;
    this.parent = parent;
    this.op = op;
    this.left = left;
    Object.seal(this);
}

Arithmetic.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(this.story,
        new ArithmeticExpression(this.story, this.parent),
        [this.op, this.left, right]
    );
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

function ComparisonExpression(story, parent) {
    this.story = story;
    this.parent = parent;
    Object.seal(this);
}

ComparisonExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeComparison(this.story, this.parent, expression);
};

function MaybeComparison(story, parent, expression) {
    this.story = story;
    this.parent = parent;
    this.expression = expression;
    Object.seal(this);
}

MaybeComparison.prototype.type = 'comparison-expression';

MaybeComparison.prototype.next = function next(type, space, text, scanner) {
    if (comparison[text] === true) {
        return new Unary(this.story,
            new MultiplicativeExpression(this.story,
                new ArithmeticExpression(this.story,
                    new Comparison(this.story, this.parent, text, this.expression))));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Comparison(story, parent, op, left) {
    this.story = story;
    this.parent = parent;
    this.op = op;
    this.left = left;
    Object.seal(this);
}

Comparison.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(this.story,
        new ArithmeticExpression(this.story,
            new ComparisonExpression(this.story, this.parent)),
        [this.op, this.left, right]
    );
};
