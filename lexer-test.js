'use strict';

var fs = require('fs');

var Lexer = require('./lexer');
var Scanner = require('./scanner');
var LexLister = require('./lex-lister');
var equals = require('pop-equals');

function test(input, output) {
    var text = input.map(enline).join('');
    var lister = new LexLister();
    var lexer = new Lexer(lister);
    var scanner = new Scanner(lexer);
    scanner.next(text);
    scanner.return();
    // istanbul ignore if
    if (!equals(lister.list, output)) {
        console.error('ERROR');
        process.stderr.write(text);
        console.error('expected', output);
        console.error('actual  ', lister.list);
        global.fail = true;
    }
}

function enline(line) {
    return line + '\n';
}

test([
    'a',
    'b',
], [
    'a',
    'b',
    'STOP'
]);

test([
    'a',
    '  b',
], [
    'a',
    'START',
    'b',
    'STOP',
    'STOP'
]);

test([
    'a',
    '  b',
    ' c'
], [
    'a',
    'START',
    'b',
    'STOP',
    'START',
    'c',
    'STOP',
    'STOP'
]);

test([
    'a',
    '  b',
    '  c'
], [
    'a',
    'START',
    'b',
    'c',
    'STOP',
    'STOP'
]);

test([
    'a',
    '  b',
    ' ',
    '  c'
], [
    'a',
    'START',
    'b',
    'BREAK',
    'c',
    'STOP',
    'STOP'
]);

test([
    'a',
    '    b',
    '   \tc'
], [
    'a',
    'START',
    'b',
    'c',
    'STOP',
    'STOP'
]);

test([
    'a',
    '- b',
    '- c'
], [
    'a',
    'START', '-',
    'b',
    'STOP',
    'START', '-',
    'c',
    'STOP',
    'STOP'
]);

test([
    'a',
    '- b',
    'c',
    '- d'
], [
    'a',
    'START', '-',
    'b',
    'STOP',
    'c',
    'START', '-',
    'd',
    'STOP',
    'STOP'
]);

test([
    'a',
    '- b',
    '   c'
], [
    'a',
    'START', '-',
    'b',
    'START',
    'c',
    'STOP',
    'STOP',
    'STOP'
]);

test([
    'a',
    '- b',
    ' - * c',
    '     d'
], [
    'a',
    'START', '-',
    'b',
    'START', '-*',
    'c',
    'd',
    'STOP',
    'STOP',
    'STOP'
]);

test([
    'a',
    '   b',
    '  c',
    ' d',
    'e'
], [
    'a',
    'START',
    'b',
    'STOP',
    'START',
    'c',
    'STOP',
    'START',
    'd',
    'STOP',
    'e',
    'STOP'
]);

test([
    'Alpha',
    '+ Bravo',
    '',
    '  Charlie',
    '+ Delta',
    '',
    '  Echo',
    'Foxtrot'
], [
    'Alpha',
    'START', '+',
    'Bravo',
    'BREAK',
    'Charlie',
    'STOP',
    'START', '+',
    'Delta',
    'BREAK',
    'Echo',
    'STOP',
    'Foxtrot',
    'STOP'
]);
