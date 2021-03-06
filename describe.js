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

types.goto = function goto(_node) {
    return '';
};

types.call = function call(node) {
    return node.label + '(' + node.args.map(S).join(' ') + ') esc ' + node.branch;
};

types.def = function def(node) {
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

types.move = function move(node) {
    return S(node.source) + ' -> ' + S(node.target);
};

types.cue = function cue(node) {
    return node.cue;
};

types.br = function br(_node) {
    return '';
};

types.par = function par(_node) {
    return '';
};

types.rule = function rule(_node) {
    return '';
};

types.startJoin = function startJoin(_node) {
    return '';
};

types.stopJoin = function stopJoin(_node) {
    return '';
};

types.delimit = function delimit(_node) {
    return '';
};

types.ask = function ask(_node) {
    return '';
};

types.read = function ask(node) {
    var label = node.variable;
    if (node.cue != null) {
        label += ' ' + node.cue;
    }
    return label;
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
