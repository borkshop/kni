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

// TODO stop merging line tokens with the accumulator (merging text tokens
// should occur during parsing or runtime). This will require passing forward
// a flag indicating whether the token was preceeded by whitespace.
// TODO create a Parser that just drives the generator state machine (instead
// of doing the state monad here), and expose an API for capturing the AST from
// a parse state, so this API can be proxied by the debug parser.

module.exports = InlineLexer;

var debug = process.env.DEBUG_INLINE_LEXER;

function InlineLexer(generator) {
    this.generator = generator;
    this.leading = true;
    this.lead = ''; // leading space
    this.space = ''; // following space
    this.accumulator = '';
    this.debug = debug;
}

InlineLexer.prototype.next = function next(type, text, scanner) {
    // istanbul ignore if
    if (this.debug) {
        console.error(
            'ILL', scanner.position(),
            type,
            JSON.stringify(this.lead),
            JSON.stringify(this.space),
            JSON.stringify(text)
        );
    }
    if (type !== 'text') {
        this.space = '';
        this.flush(scanner);
        this.generator = this.generator.next(type, this.space, text, scanner);
        return this;
    }
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        var d = text[i + 1];
        if (c === ' ' || c === '\t') {
            if (this.leading) {
                this.lead = ' ';
            } else {
                this.space = ' ';
            }
        } else if (c === '-' && d === '>') {
            this.flush(scanner);
            this.generator = this.generator.next('token', this.lead, '->', scanner);
            this.lead = '';
            this.space = '';
            this.leading = true;
            i++;
        } else if (
            c === '=' || // named label
            c === '[' || c === ']' // You a[Ask] a question.
            // TODO c === '{' || c === '}' || // logic
            // TODO c === '`' || // keyword
            // TODO c === '*' || c === '_' // strength / emphasis
        ) {
            this.flush(scanner);
            this.generator = this.generator.next('token', this.lead, c, scanner);
            this.lead = '';
            this.space = '';
            this.leading = true;
        } else {
            this.accumulator += this.space + c;
            this.space = '';
            this.leading = false;
        }
    }
    if (this.leading) {
        this.lead = ' ';
    } else {
        this.space = ' ';
    }
    return this;
};

InlineLexer.prototype.flush = function flush(scanner) {
    if (this.accumulator) {
        this.generator = this.generator.next('text', this.lead, this.accumulator, scanner);
        this.lead = '';
        this.leading = true;
        this.accumulator = '';
    }
    this.space = '';
    this.leading = true;
};
