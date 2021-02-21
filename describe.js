'use strict';

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

const types = {
    text(node) {
        return node.text;
    },

    echo(node) {
        return S(node.expression);
    },

    opt(node) {
        return '(Q ' + node.question.join(' ') + ') (A ' + node.answer.join(' ') + ')';
    },

    goto(_node) {
        return '';
    },

    call(node) {
        return node.label + '(' + node.args.map(S).join(' ') + ') esc ' + node.branch;
    },

    def(node) {
        return '(' + node.locals.join(' ') + ')';
    },

    jump(node) {
        return node.branch + ' if ' + S(node.condition);
    },

    switch(node) {
        var desc = '';
        if (node.variable) {
            desc += '(' + node.variable + '+' +  node.value + ') ' + S(node.expression);
        } else {
            desc += S(node.expression);
        }
        desc += ' (' + node.branches.join(' ') + ') W(' + node.weights.map(S).join(' ') + ')';
        return desc;
    },

    set(node) {
        return node.variable + ' ' + S(node.expression);
    },

    move(node) {
        return S(node.source) + ' -> ' + S(node.target);
    },

    cue(node) {
        return node.cue;
    },

    br(_node) {
        return '';
    },

    par(_node) {
        return '';
    },

    rule(_node) {
        return '';
    },

    startJoin(_node) {
        return '';
    },

    stopJoin(_node) {
        return '';
    },

    delimit(_node) {
        return '';
    },

    ask(_node) {
        return '';
    },

    read(node) {
        var label = node.variable;
        if (node.cue != null) {
            label += ' ' + node.cue;
        }
        return label;
    },
};

module.exports = function describe(node) {
    return types[node.type](node);
}
