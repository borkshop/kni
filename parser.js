'use strict';

module.exports = Parser;

var debug = typeof process === 'object' && process.env.DEBUG_PARSER;

function Parser(generator) {
    this.generator = generator;
    this.debug = debug;
}

Parser.prototype.next = function next(type, space, text, scanner) {
    var prior = this.generator.constructor.name;
    this.generator = this.generator.next(type, space, text, scanner);
    // istanbul ignore if
    if (!this.generator) {
        throw new Error(prior + ' returned undefined next state given ' + type + '/' + text + ' at ' + scanner.position());
    }
    // istanbul ignore if
    if (this.debug) {
        console.error(
            'PAR',
            scanner.position(),
            type, JSON.stringify(text),
            prior + '->' + this.generator.constructor.name
        );
    }
    return this;
};
