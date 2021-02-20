'use strict';

var Excerpt = require('./excerpt');
var Wrapper = require('./wrapper');

module.exports = class Console {
    constructor(writer) {
        this.writer = writer;
        this.wrapper = new Wrapper(writer);
        this.excerpt = new Excerpt();
        this.options = [];
        this.cursor = this.excerpt;
    }

    write(lift, text, drop) {
        this.cursor.digest(lift, text, drop);
    }

    break() {
        this.cursor.break();
    }

    paragraph() {
        this.cursor.paragraph();
    }

    startOption() {
        var option = new Excerpt();
        this.cursor = option;
        this.options.push(option);
    }

    stopOption() {
        this.cursor = this.excerpt;
    }

    flush() {
        this.writer.write('\n');
    }

    pardon() {
        this.writer.write('?\n');
    }

    display() {
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
    }

    clear() {
        this.excerpt = new Excerpt();
        this.options = [];
        this.cursor = this.excerpt;
    }
}
