'use strict';

var equals = require('pop-equals');
var Lexer = require('./lexer');
var Scanner = require('./scanner');
var LineLexer = require('./line-lexer');
var LexLister = require('./lex-lister');

function test(input, output) {
    var text = input.map(enline).join('');
    var lister = new LexLister();
    var lineLexer = new LineLexer(lister);
    var lexer = new Lexer(lineLexer);
    var scanner = new Scanner(lexer);
    scanner.next(text);
    scanner.return();
    lineLexer.next('stop', ''); // induce second flush for coverage

    // istanbul ignore if
    if (!equals(lister.list, output)) {
        console.error('ERROR');
        console.error(input);
        console.error('expected', output);
        console.error('actual  ', lister.list);
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
])

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
])

test([
    '-> hi',
], [
    'TOKEN', '->',
    'hi',
    'STOP',
    'STOP'
]);
