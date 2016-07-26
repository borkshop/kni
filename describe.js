'use strict';

module.exports = describe;

function describe(node) {
    return types[node.type](node);
}

var types = {};

types.text = function text(node) {
    return node.text;
};

types.echo = function echo(node) {
    return S(node.expression);
};

types.opt = function opt(node) {
    return '(Q ' + node.question.join(' ') + ') (A ' + node.answer.join(' ') + ')';
};

types.goto = function goto(node) {
    return '';
};

types.apply = function apply(node) {
    return node.branch + '(' + node.args.map(S).join(' ') + ')';
};

types.call = function call(node) {
    return node.label + ' ' + node.branch + '() -> ' + node.next;
};

types.args = function args(node) {
    return '(' + node.locals.join(' ') + ')';
};

types.jump = function jump(node) {
    return node.branch + ' if ' + S(node.condition);
};

types.switch = function _switch(node) {
    var desc = '';
    if (node.variable) {
        desc += '(' + node.variable + '+' +  node.value + ') ' + S(node.expression);
    } else {
        desc += S(node.expression);
    }
    desc += ' (' + node.branches.join(' ') + ') W(' + node.weights.map(S).join(' ') + ')';
    return desc;
};

types.set = function set(node) {
    return node.variable + ' ' + S(node.expression);
};

types.mov = function mov(node) {
    return S(node.source) + ' -> ' + S(node.target);
};

types.br = function br(node) {
    return '';
};

types.par = function par(node) {
    return '';
};

types.rule = function rule(node) {
    return '';
};

types.startJoin = function startJoin(node) {
    return '';
};

types.stopJoin = function stopJoin(node) {
    return '';
};

types.delimit = function delimit(node) {
    return '';
};

types.ask = function ask(node) {
    return '';
};

function S(args) {
    if (args[0] === 'val' || args[0] === 'get') {
        return args[1];
    } else if (args[0] === 'var') {
        return '(' + args[0] + ' ' + V(args[1], args[2]) + ')';
    } else {
        return '(' + args[0] + ' ' + args.slice(1).map(S).join(' ') + ')';
    }
}

function V(source, target) {
    var r = '';
    for (var i = 0; i < target.length; i++) {
        r += source[i];
        r += '{' + S(target[i]) + '}';
    }
    r += source[i];
    return r;
}
