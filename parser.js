'use strict';

module.exports = Parser;

var debug = process.env.DEBUG_PARSER;

function Parser(generator) {
    this.generator = generator;
    this.debug = debug;
}

Parser.prototype.next = function next(type, text, scanner) {
    var prior = this.generator.type;
    this.generator = this.generator.next(type, text, scanner);
    // istanbul ignore if
    if (this.debug) {
        console.error(
            'PAR',
            scanner.position(),
            type, JSON.stringify(text),
            prior + '->' + this.generator.type
        );
    }
    return this;
};
