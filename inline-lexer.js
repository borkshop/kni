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

var debug = typeof process === 'object' && process.env.DEBUG_INLINE_LEXER;

var L1 = '@[]{}|/<>';
var L2 = ['->', '<-', '==', '<>', '>=', '<=', '{"', '"}', '{\'', '\'}', '//', '**'];
var num = /\d/;
// alphanumerics including non-english
var alpha = /[\w\u00C0-\u1FFF\u2C00-\uD7FF\d_]/;

function InlineLexer(generator) {
    this.generator = generator;
    this.space = '';
    this.accumulator = '';
    this.type = 'symbol';
    this.debug = debug;
    Object.seal(this);
}

InlineLexer.prototype.next = function next(type, text, scanner) {
    // istanbul ignore if
    if (this.debug) {
        console.log('ILL', type, JSON.stringify(text));
    }

    if (type !== 'text') {
        this.flush();
        this.generator.next(type, ' ', text, scanner);
        this.space = '';
        return this;
    }

    var wrap = false;
    for (var i = 0; i < text.length - 1; i++) {
        var c = text[i];
        var d = text[i + 1];
        var cd = c + d;
        var numeric = num.test(c);
        var alphanum = alpha.test(c);
        if (c === ' ' || c === '\t') {
            this.flush(scanner);
            this.space = ' ';
        } else if (cd === '\\ ') {
            // Scan forward to end of line until encountering a non-space
            // character.
            for (i = i + 2; i < text.length; i++) {
                c = text[i];
                if (c !== ' ' && c !== '\t') {
                    i--;
                    break;
                }
            }
            if (i === text.length) {
                // If everything after \ is whitespace, then treat it as if
                // there is no whitespace, meaning that the \ means continue
                // through next line.
                wrap = true;
            } else {
                // Otherwise, treat all following space as a single space.
                this.flush(scanner);
                this.generator.next('literal', '', ' ', scanner);
                this.space = '';
            }
        } else if (c === '\\') {
            // TODO account for escaped space through to the end of line
            this.flush(scanner);
            this.generator.next('literal', this.space, d, scanner);
            this.space = '';
            i++;
        } else if (L2.indexOf(cd) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, cd, scanner);
            this.space = '';
            i++;
        } else if (L1.indexOf(c) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, c, scanner);
            this.space = '';
        } else if (cd === '--') {
            this.flush(scanner);
            for (var j = i + 2; j < text.length; j++) {
                c = text[j];
                if (c !== '-') {
                    break;
                }
            }
            this.generator.next('dash', this.space, text.slice(i, j), scanner);
            i = j - 1;
        } else if (this.type !== 'alphanum' && numeric) {
            if (this.type != 'number') {
                this.flush(scanner);
            }
            this.accumulator += c;
            this.type = 'number';
        } else if (alphanum) {
            if (this.type != 'alphanum') {
                this.flush(scanner);
            }
            this.accumulator += c;
            this.type = 'alphanum';
        } else {
            this.flush(scanner);
            this.generator.next(this.type, this.space, c, scanner);
            this.space = '';
        }
    }

    if (i < text.length) {
        var c = text[i];
        var numeric = num.test(c);
        var alphanum = alpha.test(c);
        if (c === '\\') {
            wrap = true;
        } else if (c === ' ' || c === '\t') {
            // noop
        } else if (L1.indexOf(c) >= 0) {
            this.flush(scanner);
            this.generator.next('token', this.space, c, scanner);
        } else if (this.type !== 'alphanum' && numeric) {
            if (this.type !== 'number') {
                this.flush(scanner);
            }
            this.accumulator += c;
            this.type = 'number';
        } else if (!alphanum) {
            this.flush(scanner);
            this.generator.next(this.type, this.space, c, scanner);
        } else {
            this.type = 'alphanum';
            this.accumulator += c;
        }
    }

    if (!wrap) {
        this.flush(scanner);
        this.space = ' ';
    }
    return this;
};

InlineLexer.prototype.flush = function flush(scanner) {
    if (this.accumulator) {
        this.generator.next(this.type, this.space, this.accumulator, scanner);
        this.accumulator = '';
        this.space = '';
        this.type = 'symbol';
    }
};
