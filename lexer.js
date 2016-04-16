'use strict';

// Transforms a stream of lines with known indentation levels and leaders like
// bullets, and transforms these into a stream of lines with start and stop
// tokens around changes in indentation depth.
//
// The outline lexer receives lines from a scanner and sends start, stop, and
// text lines to an inline lexer.

// TODO remove the break emission feature
// TODO rename as OutlineLexer outline-lexer.js

module.exports = Lexer;

var debug = process.env.DEBUG_OUTLINE_LEXER;

function Lexer(generator) {
    this.generator = generator;
    this.top = 0;
    this.stack = [this.top];
    this.broken = false;
}

Lexer.prototype.next = function next(line, scanner) {
    // istanbul ignore if
    if (debug) {
        console.error('OUTLINE', JSON.stringify(line), scanner.indent, JSON.stringify(scanner.leader), this.stack, this.top);
    }
    while (scanner.indent < this.top) {
        this.generator = this.generator.next('stop', '', scanner);
        this.stack.pop();
        this.top = this.stack[this.stack.length - 1];
    }
    if (scanner.indent > this.top) {
        this.generator = this.generator.next('start', scanner.leader, scanner);
        this.stack.push(scanner.indent);
        this.top = scanner.indent;
        this.broken = false;
    } else if (scanner.leader.length !== 0 && scanner.indent === this.top) {
        this.generator = this.generator.next('stop', '', scanner);
        this.generator = this.generator.next('start', scanner.leader, scanner);
        this.top = scanner.indent;
        this.broken = false;
    }
    if (line.length) {
        this.generator = this.generator.next('text', line, scanner);
    } else if (!this.broken) {
        this.broken = true;
        this.generator = this.generator.next('break', '', scanner);
    }
    return this;
};

Lexer.prototype.return = function _return(scanner) {
    for (var i = 0; i < this.stack.length; i++) {
        this.generator.next('stop', '', scanner);
    }
    this.stack.length = 0;
    return this;
};
