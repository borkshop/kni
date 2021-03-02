// Wraps text at word boundaries for output to columnar displays.
// Manages levels of indentation, bullets, and margin text.
'use strict';

module.exports = class Wrapper {
    constructor(target, width) {
        this.target = target;
        this.width = width || 60;
        this.indents = [''];
        this.leads = [''];
        this.index = 0;
        this.flush = false;
    }

    words(words) {
        var array = words.split(' ');
        for (var i = 0; i < array.length; i++) {
            this.word(array[i]);
        }
    }

    push(indent, lead) {
        var prefix = this.indents[this.indents.length - 1];
        this.indents.push(prefix + indent);
        this.leads.push(prefix + lead);
    }

    pop() {
        this.indents.pop();
        this.leads.pop();
    }

    word(word) {
        var indent = this.indents[this.indents.length - 1];
        if (this.index === 0) {
            this.target.write(indent);
            this.index += indent.length;
            this.flush = true;
        }
        if (this.index + word.length + 1 > this.width) {
            this.break();
            this.target.write(indent + word);
                    this.index += indent.length + word.length + 1;
            this.flush = false;
        } else if (this.flush) {
            this.target.write(word);
                    this.index += word.length;
            this.flush = false;
        } else {
            this.target.write(' ' + word);
                    this.index += word.length + 1;
            this.flush = false;
            }

    }

    break() {
        this.target.write('\n');
        this.index = 0;
        this.flush = true;
    }

    // Bring your own break, if you need it.
    bullet() {
        var lead = this.leads[this.leads.length - 1];
        this.target.write(lead);
        this.index = lead.length;
        this.flush = true;
    }
}
