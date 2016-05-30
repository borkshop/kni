'use strict';

var equals = require('pop-equals');
var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var InlineLexer = require('./inline-lexer');

var debug = process.env.DEBUG_INLINE_LEXER;

function test(input, output) {
    var text = input.map(enline).join('');
    var ll = new InlineLexLister();
    var il = new InlineLexer(ll);
    var ol = new OutlineLexer(il);
    var scanner = new Scanner(ol);
    scanner.next(text);
    scanner.return();
    il.next('stop', '', scanner); // induce second flush for coverage

    // istanbul ignore if
    if (!equals(ll.list, output)) {
        console.error('ERROR');
        console.error(input);
        console.error('expected', output);
        console.error('actual  ', ll.list);
        global.fail = true;
    }
}

function InlineLexLister() {
    this.list = [];
    this.debug = debug;
}

InlineLexLister.prototype.next = function next(type, space, text, scanner) {
    // istanbul ignore if
    if (this.debug) {
        console.log("LL", scanner.position(), type, JSON.stringify(space), JSON.stringify(text));
    }
    if (space.length) {
        this.list.push(space);
    }
    if (type !== 'text') {
        this.list.push(type.toUpperCase());
    }
    if (text) {
        this.list.push(text);
    }
    return this;
};

function enline(line) {
    return line + '\n';
}

test([
    'x',
    'y'
], [
    'x', ' ', 'y',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    'x '
], [
    'x',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    'You s[S]ay,', // the line break implies a single space
    '"Hello." -> bye',
], [
    'You', ' ', 's',
    'TOKEN', '[',
    'S',
    'TOKEN', ']',
    'ay', ',', ' ', '"', 'Hello.', '"',
    ' ', 'TOKEN', '->',
    ' ', 'bye',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '[Alpha] Omega'
], [
    'TOKEN', '[',
    'Alpha',
    'TOKEN', ']',
    ' ', 'Omega',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '[Alpha]',
    'Omega'
], [
    'TOKEN', '[',
    'Alpha',
    'TOKEN', ']',
    ' ', 'Omega',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    'And they lived happily ever after.',
    '',
    '',
    'The End'
], [

    'And', ' ', 'they', ' ', 'lived', ' ', 'happily', ' ', 'ever', ' ', 'after.',
    ' ', 'BREAK',
    'The', ' ', 'End',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '-> hi',
], [
    'TOKEN', '->',
    ' ', 'hi',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '{#gold|no gold|{$gold} gold}'
], [
    'TOKEN', '{',
    '#', 'gold',
    'TOKEN', '|',
    'no', ' ', 'gold',
    'TOKEN', '|',
    'TOKEN', '{',
    '$', 'gold',
    'TOKEN', '}',
    ' ', 'gold',
    'TOKEN', '}',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    'hello10'
], [
    'hello10',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '10hello'
], [
    '10',
    'hello',
    ' ', 'STOP',
    ' ', 'STOP'
])

test([
    '10hel_lo10'
], [
    '10', 'hel_lo10',
    ' ', 'STOP',
    ' ', 'STOP'
]);

test([
    '10hel_lo10 20'
], [
    '10', 'hel_lo10',
    ' ', '20',
    ' ', 'STOP',
    ' ', 'STOP'
]);
test([
    '10hel_lo10|20alpha'
], [
    '10', 'hel_lo10',
    'TOKEN', '|', '20', 'alpha',
    ' ', 'STOP',
    ' ', 'STOP'
]);
