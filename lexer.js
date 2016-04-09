'use strict';

module.exports = Lexer;

function Lexer(generator) {
    this.generator = generator;
    this.top = 0;
    this.stack = [this.top];
}

Lexer.prototype.next = function next(line, scanner) {
    while (scanner.indent < this.top) {
        this.generator = this.generator.next('stop', '', scanner);
        this.stack.pop();
        this.top = this.stack[this.stack.length - 1];
    }
    if (scanner.indent > this.top) {
        this.generator = this.generator.next('start', scanner.leader, scanner);
        this.stack.push(scanner.indent);
        this.top = scanner.indent;
    } else if (scanner.leader.length !== 0 && scanner.indent === this.top) {
        this.generator = this.generator.next('stop', '', scanner);
        this.generator = this.generator.next('start', scanner.leader, scanner);
        this.stack.push(scanner.indent);
        this.top = scanner.indent;
    }
    if (line.length) {
        this.generator = this.generator.next('text', line, scanner);
    } else {
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
