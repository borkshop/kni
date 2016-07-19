'use strict';

module.exports = evaluate;

function evaluate(scope, randomer, args) {
    var name = args[0];
    if (unary[name] && args.length === 2) {
        return unary[name](
            evaluate(scope, randomer, args[1]),
            scope,
            randomer
        );
    } else if (binary[name] && args.length === 3) {
        return binary[name](
            evaluate(scope, randomer, args[1]),
            evaluate(scope, randomer, args[2]),
            scope,
            randomer
        );
    } else if (name === 'val') {
        return args[1];
    } else if (name === 'get') {
        return +scope.get(args[1]);
    // istanbul ignore else
    } else if (name === 'var') {
        return +scope.get(nominate(scope, randomer, args));
    } else {
        throw new Error('Unexpected operator ' + JSON.stringify(args));
    }
}

evaluate.nominate = nominate;
function nominate(scope, randomer, args) {
    if (args[0] === 'get') {
        return args[1];
    }
    var literals = args[1];
    var variables = args[2];
    var name = '';
    for (var i = 0; i < variables.length; i++) {
        name += literals[i] + evaluate(scope, randomer, variables[i]);
    }
    name += literals[i];
    return name;
}

var binary = {
    '+': function (x, y) {
        return x + y;
    },
    '-': function (x, y) {
        return x - y;
    },
    '*': function (x, y) {
        return x * y;
    },
    '/': function (x, y) {
        return (x / y) >> 0;
    },
    '%': function (x, y) {
        return x % y;
    },
    'or': function (x, y) {
        return x || y ? 1 : 0;
    },
    'and': function (x, y) {
        return x && y ? 1 : 0;
    },
    '>=': function (x, y) {
        return x >= y ? 1 : 0;
    },
    '>': function (x, y) {
        return x > y ? 1 : 0;
    },
    '<=': function (x, y) {
        return x <= y ? 1 : 0;
    },
    '<': function (x, y) {
        return x < y ? 1 : 0;
    },
    '==': function (x, y) {
        return x === y ? 1 : 0;
    },
    '!=': function (x, y) {
        return x != y ? 1 : 0;
    },
    '#': function (x, y) {
        return hilbert(x, y);
    },
    '~': function (x, y, scope, randomer) {
        var r = 0;
        for (var i = 0; i < x; i++) {
            r += randomer.random() * y;
        }
        return Math.floor(r);
    }
};

// istanbul ignore next
var unary = {
    '!': function (x) {
        return x ? 0 : 1;
    },
    '-': function (x) {
        return -x;
    },
    '~': function (x, scope, randomer) {
        return Math.floor(randomer.random() * x);
    },
    '#': function (x) {
        return hash(x);
    }
};

// Robert Jenkins's 32 bit hash function
// https://gist.github.com/badboy/6267743
evaluate.hash = hash;
function hash(a) {
    a = (a+0x7ed55d16) + (a<<12);
    a = (a^0xc761c23c) ^ (a>>>19);
    a = (a+0x165667b1) + (a<<5);
    a = (a+0xd3a2646c) ^ (a<<9);
    a = (a+0xfd7046c5) + (a<<3);
    a = (a^0xb55a4f09) ^ (a>>>16);
    return a;
}

// hilbert in range from 0 to 2^32
// x and y in range from 0 to 2^16
// each dimension has origin at 2^15
var dimensionWidth = (-1 >>> 16) + 1;
var halfDimensionWidth = dimensionWidth / 2;
function hilbert(x, y) {
    x += halfDimensionWidth;
    y += halfDimensionWidth;
    var rx = 0;
    var ry = y;
    var scalar = 0;
    for (var scale = dimensionWidth; scale > 0; scale /= 2) {
        rx = x & scale;
        ry = y & scale;
        scalar += scale * ((3 * rx) ^ ry);
        // rotate
        if (!ry) {
            if (rx) {
                x = scale - 1 - x;
                y = scale - 1 - y;
            }
            // transpose
            var t = x;
            x = y;
            y = t;
        }
    }
    return scalar;
}
