'use strict';

var fs = require('fs');

var Scanner = require('./scanner');
var OutlineLexer = require('./outline-lexer');
var equals = require('pop-equals');

var debug = process.env.DEBUG_OUTLINE_LEXER;

function test(input, output) {
    var text = input.map(enline).join('');
    var lister = new OutlineLexLister();
    var lexer = new OutlineLexer(lister);
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

function OutlineLexLister() {
    this.list = [];
    this.debug = debug;
}

OutlineLexLister.prototype.next = function next(type, text, scanner) {
    // istanbul ignore if
    if (this.debug) {
        console.log("OLL", scanner.position(), type, JSON.stringify(text));
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
    'b',
    'STOP'
]);

test([
    'a',
    '  b',
    ' c'
], [
    'a',
    'b',
    'c',
    'STOP'
]);

test([
    'a',
    '  b',
    '  c'
], [
    'a',
    'b',
    'c',
    'STOP'
]);

test([
    'a',
    '  b',
    ' ',
    '  c'
], [
    'a',
    'b',
    'BREAK',
    'c',
    'STOP'
]);

test([
    'a',
    '    b',
    '   \tc'
], [
    'a',
    'b',
    'c',
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
    'c',
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
    'b',
    'c',
    'd',
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

test([
    '+ A',
    '  + B',
    '  >',
    '>',
    'B'
], [
    'START', '+',
        'A',
        'START', '+',
            'B',
        'STOP',
        'START', '>', 'BREAK', 'STOP',
    'STOP',
    'START', '>', 'BREAK', 'STOP',
    'B',
    'STOP'
]);
