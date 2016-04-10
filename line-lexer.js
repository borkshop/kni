'use strict';

module.exports = LineScanner;

function LineScanner(generator) {
    this.generator = generator;
    this.spaced = false;
    this.skipping = false;
    this.accumulator = '';
}

LineScanner.prototype.next = function next(type, text) {
    if (type !== 'text') {
        this.flush();
        this.generator = this.generator.next(type, text);
        return;
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
                this.flush();
                this.generator = this.generator.next('token', '->');
                this.spaced = false;
                this.skipping = true;
                i++;
            } else if (
                c === '[' || c === ']' // You a[Ask] a question.
                // TODO c === '{' || c === '}' || // logic
                // TODO c === '`' || // keyword
                // TODO c === '*' || c === '_' // strength / emphasis
            ) {
                this.flush();
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
};

LineScanner.prototype.flush = function flush() {
    if (this.accumulator) {
        this.generator = this.generator.next('text', this.accumulator);
        this.accumulator = '';
    }
};
