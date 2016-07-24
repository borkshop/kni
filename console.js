'use strict';

module.exports = Console;

var Excerpt = require('./excerpt');
var Wrapper = require('./wrapper');

function Console(writer) {
    this.writer = writer;
    this.wrapper = new Wrapper(writer);
    this.excerpt = new Excerpt();
    this.options = [];
    this.cursor = this.excerpt;
}

Console.prototype.write = function write(lift, text, drop) {
    this.cursor.digest(lift, text, drop);
};

Console.prototype.break = function _break() {
    this.cursor.break();
};

Console.prototype.paragraph = function paragraph() {
    this.cursor.paragraph();
};

Console.prototype.startOption = function startOption() {
    var option = new Excerpt();
    this.cursor = option;
    this.options.push(option);
};

Console.prototype.stopOption = function stopOption() {
    this.cursor = this.excerpt;
};

Console.prototype.flush = function flush() {
    this.writer.write('\n');
};

Console.prototype.pardon = function pardon() {
    this.writer.write('?\n');
};

Console.prototype.display = function display() {
    this.excerpt.write(this.wrapper);
    for (var i = 0; i < this.options.length; i++) {
        var number = i + 1;
        var lead = (number + '.   ').slice(0, 3) + ' ';
        this.wrapper.word(lead);
        this.wrapper.flush = true;
        this.wrapper.push('    ', '   ');
        this.options[i].write(this.wrapper);
        this.wrapper.pop();
    }
};

Console.prototype.clear = function clear() {
    this.excerpt = new Excerpt();
    this.options = [];
    this.cursor = this.excerpt;
};
