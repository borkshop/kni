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

Open.prototype.return = function _return(expression) {
    return new Close(this.parent, expression);
};

function Close(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

Close.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore else
    if (type === 'text' && text === ')') {
        return this.parent.return(this.expression);
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
        return this.parent.return(['val', +text]);
    } else if (text === '(') {
        return parenthesized(this.parent);
    // istanbul ignore else
    } else if (type === 'text') {
        return this.parent.return(['get', text]);
    }
    // istanbul ignore next
    throw new Error('Expected value, got ' + type + ' ' + text);
};

function MultiplicativeExpression(parent) {
    this.parent = parent;
}

MultiplicativeExpression.prototype.return = function _return(expression) {
    return new MaybeMultiplicative(this.parent, expression);
};

function MaybeMultiplicative(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

MaybeMultiplicative.prototype.next = function next(type, space, text, scanner) {
    if (text === '*' || text === '/' || text === '%' || text === '~') {
        return new Value(new Multiplicative(this.parent, text, this.expression));
    } else {
        return this.parent.return(this.expression)
            .next(type, space, text, scanner);
    }
};

function Multiplicative(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Multiplicative.prototype.return = function _return(right) {
    return new MaybeMultiplicative(this.parent, [this.op, this.left, right]);
};

function ArithmeticExpression(parent) {
    this.parent = parent;
}

ArithmeticExpression.prototype.return = function _return(expression) {
    return new MaybeArithmetic(this.parent, expression);
};

function MaybeArithmetic(parent, expression) {
    this.parent = parent;
    this.expression = expression;
}

MaybeArithmetic.prototype.next = function next(type, space, text, scanner) {
    if (text === '+' || text === '-') {
        return new Value(
            new MultiplicativeExpression(
                new Arithmetic(this.parent, text, this.expression)));
    } else {
        return this.parent.return(this.expression)
            .next(type, space, text, scanner);
    }
};

function Arithmetic(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Arithmetic.prototype.return = function _return(right) {
    return new MaybeMultiplicative(
        new ArithmeticExpression(this.parent),
        [this.op, this.left, right]
    );
};

var comparison = {'<': true, '<=': true, '==': true, '!=': true, '>=': true, '>': true, '#': true};

function ComparisonExpression(parent) {
    this.parent = parent;
}

ComparisonExpression.prototype.return = function _return(expression) {
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
        return this.parent.return(this.expression)
            .next(type, space, text, scanner);
    }
};

function Comparison(parent, op, left) {
    this.parent = parent;
    this.op = op;
    this.left = left;
}

Comparison.prototype.return = function _return(right) {
    return new MaybeMultiplicative(new ArithmeticExpression(new ComparisonExpression(this.parent)),
        [this.op, this.left, right]
    );
};
