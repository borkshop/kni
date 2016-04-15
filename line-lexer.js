'use strict';

module.exports = LineLexer;

var debug = process.env.DEBUG_INLINE_LEXER;

function LineLexer(generator) {
    this.generator = generator;
    this.spaced = false;
    this.skipping = false;
    this.accumulator = '';
}

LineLexer.prototype.next = function next(type, text, scanner) {
    // istanbul ignore if
    if (debug) {
        console.error('INLINE', type, JSON.stringify(text), this.spaced ? 'spaced' : '');
    }
    if (type !== 'text') {
        this.flush(scanner);
        this.generator = this.generator.next(type, text);
        return this;
    }
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        var d = text[i + 1];
        if (c === ' ' || c === '\t') {
            if (!this.skipping) {
                this.spaced = true;
            }
        } else {
            this.skipping = false;
            if (c === '-' && d === '>') {
                this.flush(scanner);
                this.generator = this.generator.next('token', '->');
                this.spaced = false;
                this.skipping = true;
                i++;
            } else if (
                c === '=' || // named label
                c === '[' || c === ']' // You a[Ask] a question.
                // TODO c === '{' || c === '}' || // logic
                // TODO c === '`' || // keyword
                // TODO c === '*' || c === '_' // strength / emphasis
            ) {
                this.flush(scanner);
                this.generator = this.generator.next('token', c);
            } else if (this.spaced) {
                this.spaced = false;
                this.accumulator += ' ' + c;
            } else {
                this.accumulator += c;
            }
        }
    }
    this.spaced = true;
    return this;
};

LineLexer.prototype.flush = function flush(scanner) {
    if (this.accumulator) {
        this.generator = this.generator.next('text', this.accumulator, scanner);
        this.accumulator = '';
    }
    this.spaced = false;
    this.skipping = false;
};
