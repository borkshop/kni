// @ts-check

'use strict';

var Path = require('./path');

/** @typedef {import('./path').Path} PathT */

/** @typedef {unknown} Node -- FIXME from story module */

module.exports = class Scope {
    /**
     * @param {Node[]} ends
     * @param {string} name
     */
    static tie(ends, name) {
        for (const end of ends) {
            if (end.type === 'branch') {
                end.node.branch = name;
            } else {
                end.next = name;
            }
        }
    }

    /**
     * @param {unknown} story
     * @param {PathT} path
     * @param {PathT} base
     */
    constructor(story, path, base) {
        this.story = story;
        this.path = path;
        this.base = base;
    }

    /** @returns {string} */
    name() {
        return Path.toName(this.path);
    }

    /**
     * @param {string} type
     * @param {unknown} arg
     * @param {string} position
     */
    create(type, arg, position) {
        return this.story.create(this.path, type, arg, position);
    }

    next() {
        return new Scope(this.story, Path.next(this.path), this.base);
    }

    zerothChild() {
        return new Scope(this.story, Path.zerothChild(this.path), this.base);
    }

    firstChild() {
        return new Scope(this.story, Path.firstChild(this.path), this.base);
    }

    /**
     * @param {string} label
     */
    label(label) {
        return new Scope(this.story, Path.zerothChild(Path.toName(this.base) + '.' + label), this.base);
    }

    /**
     * @param {Node[]} nodes
     */
    tie(nodes) {
        Scope.tie(nodes, this.name());
    }

    /**
     * @param {string} message
     */
    error(message) {
        this.story.error(message);
    }
}
