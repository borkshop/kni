'use strict';

// Transforms a stream of lines with known indentation levels and leaders like
// bullets, and transforms these into a stream of lines with start and stop
// tokens around changes in indentation depth.
//
// The outline lexer receives lines from a scanner and sends start, stop, and
// text lines to an inline lexer.

// TODO remove the break emission feature

module.exports = class OutlineLexer {
    debug = typeof process === 'object' && process.env.DEBUG_OUTLINE_LEXER

    constructor(generator) {
        this.generator = generator;
        this.top = 0;
        this.stack = [this.top];
        this.broken = false;
    }

    next(line, scanner) {
        if (this.debug) {
            console.error(
                'OLL', scanner.position(),
                JSON.stringify(line),
                'indent', scanner.indent,
                'leader', JSON.stringify(scanner.leader),
                'stack', this.stack,
                'top', this.top
            );
        }
        while (scanner.indent < this.top) {
            this.generator = this.generator.next('stop', '', scanner);
            this.stack.pop();
            this.top = this.stack[this.stack.length - 1];
        }
        if (scanner.leader.length !== 0 && scanner.indent > this.top) {
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
    }

    return(scanner) {
        for (var i = 0; i < this.stack.length; i++) {
            this.generator = this.generator.next('stop', '', scanner);
        }
        this.stack.length = 0;
        return this;
    }
}
