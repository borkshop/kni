// @ts-check

'use strict';

var Path = require('./path');

/** @typedef {import('./path').Path} PathT */

/** @typedef {null|string|number} Atom */
/** @typedef {[string, ...Arg[]]} Expr */
/** @typedef {Atom|Expr} Arg */

/** TODO structural enum on type property
 *
 * @typedef {object} Node
 * @prop {string} type
 * @prop {Arg} [next] -- NOTE only $goto isn't able to satisfy tighter string type
 *   - is that valid?
 *   - why can $ask lack a next?
 *
 * @prop {string} [lift] -- $text, $echo
 * @prop {string} [drop] -- $text, $echo
 * @prop {Arg} [text] -- $text
 *
 * @prop {Arg} [expression] -- $echo, $switch
 * @prop {Arg} [source] -- $move
 * @prop {Arg} [target] -- $move
 * @prop {Arg} [locals] -- $def
 *
 * @prop {Arg} [variable] -- $read
 * @prop {Arg} [cue] -- $read, $cue
 *
 * @prop {unknown[]} [question] -- $option
 * @prop {unknown[]} [answer] -- $option
 * @prop {unknown} [keywords] -- $option
 *
 * @prop {string} [branch] -- $call, $jump
 * @prop {Arg} [label] -- $call
 * @prop {Arg} [args] -- $call
 * @prop {Arg} [condition] -- $jump
 */

module.exports = class Story {
    /** @type {Object<string, Node>} */
    states = {} // TODO Map<string, T>

    /** @type {string[]} */
    errors = []

    /**
     * @param {PathT} path
     * @param {string} type
     * @param {Arg} arg
     * @param {string} position
     */
    create(path, type, arg, position) {
        const name = Path.toName(path);
        const makeNode = this.nodeMakers[type];
        if (!makeNode) {
            throw new Error('No node constructor for type: ' + type);
        }
        const node = {...makeNode(arg), position};
        this.states[name] = node; // TODO assert unique?
        return node;
    }

    /** @param {string} error */
    error(error) {
        this.errors.push(error);
    }

    /** @typedef {(arg: Arg) => Node} NodeMaker */
    /** @type {Object<string, NodeMaker>} */
    nodeMakers = {
        text(text) { return {type: 'text', text, lift: ' ', drop: ' ', next: 'RET'} },
        echo(expression) { return {type: 'echo', expression, lift: '', drop: '', next: 'RET'} },
        option(_label) { return {type: 'opt', question: [], answer: [], keywords: null, next: 'RET'} },
        goto(next) { return {type: 'goto', next} },
        call(label) { return {type: 'call', label, args: null, next: 'RET', branch: 'RET'} },
        cue(cue) { return {type: 'cue', cue, next: 'RET'} },
        def(locals) { return {type: 'def', locals, next: 'RET'} },
        jump(condition) { return {type: 'jump', condition, branch: 'RET', next: 'RET'} },
        switch(expression) { return {type: 'switch', expression,
            variable: null, value: 0,
            mode: null, branches: [], weights: [],
            next: 'RET',
        } },
        move() { return {type: 'move', source: null, target: null, next: 'RET'} },
        break() { return {type: 'br', next: 'RET'} },
        paragraph() { return {type: 'par', next: 'RET'} },
        rule() { return {type: 'rule', next: 'RET'} },
        ask() { return {type: 'ask'} },
        read(variable) { return {type: 'read', variable, cue: null, next: 'RET'} },
    }
}
