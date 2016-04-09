'use strict';

module.exports = LexLister;

function LexLister() {
    this.list = [];
}

LexLister.prototype.next = function next(type, text) {
    if (type !== 'text') {
        this.list.push(type.toUpperCase());
    }
    if (text) {
        this.list.push(text);
    }
    return this;
};
