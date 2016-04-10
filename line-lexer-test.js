'use strict';

var equals = require('pop-equals');
var LineLexer = require('./line-lexer');
var LexLister = require('./lex-lister');

function test(input, output) {
    var lister = new LexLister();
    var scanner = new LineLexer(lister);
    for (var i = 0; i < input.length; i++) {
        scanner.next('text', input[i]);
    }
    scanner.next('stop', '');
    scanner.next('stop', ''); // the second induces another flush

    // istanbul ignore if
    if (!equals(lister.list, output)) {
        console.error('ERROR');
        console.error(input);
        console.error('expected', output);
        console.error('actual  ', lister.list);
        global.fail = true;
    }
}

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

