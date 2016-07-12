'use strict';
var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var Parser = require('./parser');
var Expression = require('./expression');

function testVar(text, expected) {
    var actual;
    var remainder;
    var end = {
        next: function (type, space, text) {
            return this;
        }
    };
    var parent = {
        return: function _return(expression) {
            actual = expression;
            return end;
        }
    };
    var p = new Parser(Expression.variable(null, parent));
    var il = new InlineLexer(p);
    var ol = new OutlineLexer(il);
    var s = new Scanner(ol);
    s.next(text);
    s.return();
    // istanbul ignore next
    if (!equals(actual, expected)) {
        console.log('ERROR');
        console.log('input   ', text);
        console.log('expected', expected);
        console.log('actual  ', actual);
        global.fail = true;
    }
}

testVar('x', ['get', 'x']);
testVar('x.y', ['get', 'x.y']);
testVar('x.1', ['get', 'x.1']);
testVar('{x}', ['var', ['', ''], [['get', 'x']]]);
testVar('{x}.', ['var', ['', '.'], [['get', 'x']]]);
testVar('{x}.y', ['var', ['', '.y'], [['get', 'x']]]);
testVar('{x}.{y}', ['var', ['', '.', ''], [['get', 'x'], ['get', 'y']]]);
testVar('{x}.{y}.{z}', ['var', ['', '.', '.', ''], [['get', 'x'], ['get', 'y'], ['get', 'z']]]);
testVar('x.{y}', ['var', ['x.', ''], [['get', 'y']]]);
testVar('x x', ['get', 'x']);
