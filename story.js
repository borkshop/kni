'use strict';

var Path = require('./path');

module.exports = class Story {
    states = {}

    errors = []

    create(path, type, arg, position) {
        const name = Path.toName(path);
        const makeNode = this.nodeMakers[type];
        if (!makeNode) {
            throw new Error('No node constructor for type: ' + type);
        }
        const node = {...makeNode(arg), position};
        this.states[name] = node;
        return node;
    }

    error(error) {
        this.errors.push(error);
    }

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
