'use strict';

// Receives a stream of start, stop, and text tokens from an outline lexer and
// produces a more comprehensive stream of tokens by breaking text tokens into
// constituent text and operator tokens.
// For example, "= hi -> hi" would break into four tokens.
//
// The token stream ultimately drives a parser state machine.
// The `next` method of the parse state must return another parse state.
// Each parse state must capture the syntax tree and graph of incomplete parse
// states.
// The final parse state captures the entire syntax tree.

module.exports = InlineLexer;

var debug = process.env.DEBUG_INLINE_LEXER;

var L1 = '=[]{}|/<>';
var L2 = ['->', '==', '!=', '>=', '<='];
var alpha = /\w/;

function InlineLexer(generator) {
    this.generator = generator;
    this.space = '';
    this.accumulator = '';
    this.debug = debug;
}

InlineLexer.prototype.next = function next(type, text, scanner) {
    // istanbul ignore if
    if (this.debug) {
        console.log('ILL', type, JSON.stringify(text));
    }

    if (type !== 'text') {
        this.generator.next(type, '', text, scanner);
        this.space = '';
        return this;
    }

    for (var i = 0; i < text.length - 1; i++) {
        var c = text[i];
        var cc = c + text[i + 1];
        if (c === ' ' || c === '\t') {
            this.flush(scanner);
            this.space = ' ';
        } else if (L2.indexOf(cc) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, cc, scanner);
            this.space = '';
            i++;
        } else if (L1.indexOf(c) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, c, scanner);
            this.space = '';
        } else if (!alpha.test(c)) {
            this.flush(scanner);
            this.generator.next('text', this.space, c, scanner);
            this.space = '';
        } else {
            this.accumulator += c;
        }
    }

    if (i < text.length) {
        var c = text[i];
        if (c === ' ' || c === '\t') {
            // noop
        } else if (L1.indexOf(c) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, c, scanner);
        } else if (!alpha.test(c)) {
            this.flush(scanner);
            this.generator.next('text', this.space, c, scanner);
            this.space = '';
        } else {
            this.accumulator += c;
        }
    }

    this.flush(scanner);
    this.space = ' ';
    return this;
};

InlineLexer.prototype.flush = function flush(scanner) {
    if (this.accumulator) {
        this.generator.next('text', this.space, this.accumulator, scanner);
        this.accumulator = '';
        this.space = '';
    }
};
