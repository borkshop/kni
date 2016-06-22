'use strict';

module.exports = evaluate;

function evaluate(scope, args) {
    var name = args[0];
    if (binary[name]) {
        return binary[name](evaluate(scope, args[1]), evaluate(scope, args[2]));
    } else if (unary[name]) {
        return unary[name](evaluate(scope, args[1]));
    } else if (name === 'val') {
        return args[1];
    } else if (name === 'get') {
        return scope.get(args[1]);
    }
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
        return (x / y) >>> 0;
    },
    '%': function (x, y) {
        return x % y;
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
    '~': function (x, y) {
        var r = 0;
        for (var i = 0; i < x; i++) {
            r += Math.random() * y;
        }
        return Math.floor(r);
    }
};

var unary = {
    '!': function (x) {
        return x ? 0 : 1;
    }
};

evaluate.hash = hash;
function hash(x) {
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = ((x >>> 16) ^ x) * 0x45d9f3b;
    x = ((x >>> 16) ^ x);
    return x >>> 0;
}

var msb = (-1 >>> 1) + 1;
var hsb = (-1 >>> 16) + 1;

function hilbert(x, y) {
    if (x < 0) {
        x += hsb;
    }
    if (y < 0) {
        y += hsb;
    }
    var rx = 0;
    var ry = y;
    var scalar = 0;
    for (var scale = msb; scale > 0; scale /= 2) {
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
