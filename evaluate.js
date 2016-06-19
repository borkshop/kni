'use strict';

module.exports = evaluate;

function evaluate(scope, args) {
    var name = args[0];
    if (binary[name]) {
        return binary[name](evaluate(scope, args[1]), evaluate(scope, args[2]));
    } else if (name === 'val') {
        return args[1];
    } else if (name === 'get') {
        return scope.get(args[1]);
    }
}

var binary = {
    "+": function (x, y) {
        return x + y;
    },
    "-": function (x, y) {
        return x - y;
    },
    "*": function (x, y) {
        return x * y;
    },
    "/": function (x, y) {
        return x / y;
    },
    "%": function (x, y) {
        return x % y;
    },
};
