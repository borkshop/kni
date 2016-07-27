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
    } else if (name === 'call') {
        var name = args[1][1];
        var f = functions[name];
        if (!f) {
            // TODO thread line number for containing instruction
            throw new Error('No function named ' + name);
        }
        var values = [];
        for (var i = 2; i < args.length; i++) {
            values.push(evaluate(scope, randomer, args[i]));
        }
        return f.apply(null, values);
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

var functions = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan2: Math.atan2,
    atan: Math.atan,
    exp: Math.exp,
    log: Math.log,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    sin: Math.sin,
    tan: Math.tan,

    sign: function (x) {
        if (x < 0) {
            return -1;
        }
        if (x > 0) {
            return 1;
        }
        return 0;
    },

    mean: function () {
        var mean = 0;
        for (var i = 0; i < arguments.length; i++) {
            mean += arguments[i];
        }
        return mean / i;
    },

    root: function root(x, y) {
        if (y === 2 || y == null) {
            return Math.sqrt(x);
        }
        return Math.pow(x, 1 / y);
    },

    distance: function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    manhattan: function distance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1, 2) + Math.abs(y2 - y1);
    },

    // TODO parameterize these functions in terms of the expected turns to
    // go from 25% to 75% of capacity, to adjust the rate. This will maybe
    // almost make them understandable.
    //
    // sigmoid: function (steps, cap) {
    //     if (steps === -Infinity) {
    //         return 0;
    //     } else if (steps === Infinity) {
    //         return cap;
    //     } else {
    //         return cap / (1 + Math.pow(Math.E, -steps));
    //     }
    // },

    // diomgis: function (pop, cap) {
    //     if (pop <= 0) {
    //         return -Infinity;
    //     }
    //     var ratio = cap / pop - 1;
    //     if (ratio === 0) {
    //         return Infinity;
    //     }
    //     return -Math.log(ratio, Math.E);
    // },

};

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
        return ((x % y) + y) % y;
    },
    '**': function (x, y) {
        return Math.pow(x, y);
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
    '<>': function (x, y) {
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
    'not': function (x) {
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
