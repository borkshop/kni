'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');
var LexLister = require('./lex-lister');

function test(input, output) {
    var text = input.map(enline).join('');
    var ll = new LexLister();
    var il = new InlineLexer(ll);
    var ol = new OutlineLexer(il);
    var scanner = new Scanner(ol);
    scanner.next(text);
    scanner.return();
    il.next('stop', ''); // induce second flush for coverage

    // istanbul ignore if
    if (!equals(ll.list, output)) {
        console.error('ERROR');
        console.error(input);
        console.error('expected', output);
        console.error('actual  ', ll.list);
        global.fail = true;
    }
}

function enline(line) {
    return line + '\n';
}

test([
    'x',
    'y'
], [
    'x y',
    'STOP',
    'STOP'
]);

test([
    'You s[S]ay,', // the line break implies a single space
    '"Hello." -> bye',
], [
    'You s',
    'TOKEN', '[',
    'S',
    'TOKEN', ']',
    'ay, "Hello."',
    'TOKEN', '->',
    'bye',
    'STOP',
    'STOP'
]);

test([
    'And they lived happily ever after.',
    '',
    '',
    'The End'
], [
    'And they lived happily ever after.',
    'BREAK',
    'The End',
    'STOP',
    'STOP'
]);

test([
    '-> hi',
], [
    'TOKEN', '->',
    'hi',
    'STOP',
    'STOP'
]);
