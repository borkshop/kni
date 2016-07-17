'use strict';

module.exports = describe;

function describe(node) {
    return types[node.type](node);
}

var types = {};

types.text = function text(node) {
    return (node.lift ? '' : '-') +
        node.text.slice(0, 30) +
        (node.drop ? '' : '-');
};

types.print = function print(node) {
    return S(node.expression);
};

types.option = function option(node) {
    return '(Q ' + node.question.join(' ') + ') (A ' + node.answer.join(' ') + ')';
};

types.goto = function goto(node) {
    return '';
};

types.call = function call(node) {
    return node.label + ' ' + node.branch + '() -> ' + node.next;
};

types.subroutine = function subroutine(node) {
    return '(' + node.locals.join(', ') + ')';
};

types.jump = function jump(node) {
    return node.branch + ' if ' + S(node.condition);
};

types.switch = function _switch(node) {
    if (node.variable) {
        return node.mode + ' (' + node.variable + '+' +  node.value + ') ' + S(node.expression);
    } else {
        return node.mode + ' ' + S(node.expression);
    }
};

types.set = function set(node) {
    return node.variable + ' ' + S(node.expression);
};

types.mov = function mov(node) {
    return S(node.source) + ' -> ' + S(node.expression);
};

types.break = function _break(node) {
    return '';
};

types.paragraph = function paragraph(node) {
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

types.prompt = function prompt(node) {
    return '';
};

function S(args) {
    if (args[0] === 'val' || args[0] === 'get') {
        return args[1];
    } else {
        return '(' + args[0] + ' ' + args.slice(1).map(S).join(' ') + ')';
    }
}
