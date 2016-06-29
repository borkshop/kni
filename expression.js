'use strict';

module.exports = expression;

function expression(parent) {
    return new Value(new MultiplicativeExpression(new ArithmeticExpression(new ComparisonExpression(parent))));
}

expression.parenthesized = parenthesized;
function parenthesized(parent) {
    return expression(new Open(parent));
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

function Open(parent) {
    this.parent = parent;
}

Open.prototype.return = function _return(expression, scanner) {
    return new Close(this.parent, expression);
};

function Close(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

Close.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'symbol' && text === ')') {
        return this.parent.return(this.expression, scanner);
    }
    // istanbul ignore next
    throw new Error('Expected expression to continue or end, got ' + type + ' ' + text);
};

function Value(parent) {
    this.parent = parent;
    Object.seal(this);
}

Value.prototype.next = function next(type, space, text, scanner) {
    if (type === 'number') {
        return this.parent.return(['val', +text], scanner);
    } else if (text === '(') {
        return parenthesized(this.parent);
    } else if (text === '$') {
        return new GetDynamicVariable(this.parent, [''], []);
    // istanbul ignore else
    } else if (type === 'alphanum') {
        return new GetStaticVariable(this.parent, [], [], text);
    }
    // istanbul ignore next
    throw new Error('Expected value, got ' + type + ' ' + text + ' at ' + scanner.position());
};

expression.variable = variable;
function variable(parent) {
    return new GetStaticVariable(parent, [], [], '');
}

function GetDynamicVariable(parent, literals, variables) {
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.variable = '';
}

GetDynamicVariable.prototype.next = function next(type, space, text, scanner) {
    if ((type ===  'alphanum' || type === 'number') && space === '') {
        this.variable += text;
        return this;
    }
    return new GetStaticVariable(this.parent, this.literals, this.variables.concat([this.variable]), '')
        .next(type, space, text, scanner);
};

function GetStaticVariable(parent, literals, variables, literal) {
    this.parent = parent;
    this.literals = literals;
    this.variables = variables;
    this.literal = literal;
}

GetStaticVariable.prototype.next = function next(type, space, text, scanner) {
    if ((space === '' || this.literal === '') && space === '') {
        if (text === '$') {
            return new GetDynamicVariable(this.parent, this.literals.concat([this.literal]), this.variables);
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
        state = this.parent.return(['get', this.literal], scanner);
    } else {
        state = this.parent.return(['var', this.literals.concat([this.literal]), this.variables], scanner);
    }
    return state.next(type, space, text, scanner);
};

function MultiplicativeExpression(parent) {
    this.parent = parent;
}

MultiplicativeExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeMultiplicative(this.parent, expression);
};

function MaybeMultiplicative(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

MaybeMultiplicative.prototype.next = function next(type, space, text, scanner) {
    if (text === '*' || text === '/' || text === '%' || text === '~' || text === '^') {
        return new Value(new Multiplicative(this.parent, text, this.expression));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Multiplicative(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Multiplicative.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(this.parent, [this.op, this.left, right]);
};

function ArithmeticExpression(parent) {
    this.parent = parent;
}

ArithmeticExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeArithmetic(this.parent, expression);
};

function MaybeArithmetic(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

MaybeArithmetic.prototype.next = function next(type, space, text, scanner) {
    if (text === '+' || text === '-' || text === 'v') {
        return new Value(
            new MultiplicativeExpression(
                new Arithmetic(this.parent, text, this.expression)));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Arithmetic(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Arithmetic.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(
        new ArithmeticExpression(this.parent),
        [this.op, this.left, right]
    );
};

var comparison = {'<': true, '<=': true, '==': true, '!=': true, '>=': true, '>': true, '#': true};

function ComparisonExpression(parent) {
    this.parent = parent;
}

ComparisonExpression.prototype.return = function _return(expression, scanner) {
    return new MaybeComparison(this.parent, expression);
};

function MaybeComparison(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

MaybeComparison.prototype.next = function next(type, space, text, scanner) {
    if (comparison[text] === true) {
        return new Value(
            new MultiplicativeExpression(
                new ArithmeticExpression(
                    new Comparison(this.parent, text, this.expression))));
    } else {
        return this.parent.return(this.expression, scanner)
            .next(type, space, text, scanner);
    }
};

function Comparison(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Comparison.prototype.return = function _return(right, scanner) {
    return new MaybeMultiplicative(new ArithmeticExpression(new ComparisonExpression(this.parent)),
        [this.op, this.left, right]
    );
};
