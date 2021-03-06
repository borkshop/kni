// @ts-check

'use strict';

module.exports = class Parser {
    debug = typeof process === 'object' && process.env.DEBUG_PARSER

    /** @typedef {import('./scanner')} Scanner */
    
    /**
     * @typedef {object} State
     * @prop {(type: string, space: string, text: string, sc: Scanner) => State} next
     */

    /**
     * @param {State} generator
     */
    constructor (generator) {
        this.generator = generator;
    }

    /**
     * @param {string} type
     * @param {string} space
     * @param {string} text
     * @param {Scanner} scanner
     * @returns {Parser}
     */
    next(type, space, text, scanner) {
        var prior = this.generator.constructor.name;
        this.generator = this.generator.next(type, space, text, scanner);
        if (this.debug) {
            console.error(
                'PAR',
                scanner.position(),
                type, JSON.stringify(text),
                prior + '->' + this.generator.constructor.name
            );
        }
        return this;
    }
}
