'use strict';

// Transforms a stream of text into a sequence of 'lines', tracking each line's
// level of indentation.

var tabWidth = 4;
var debug = process.env.DEBUG_SCANNER;

module.exports = Scanner;

function Scanner(generator) {
    this.generator = generator;
    this.indent = 0;
    this.lineStart = 0;
    this.indentStart = 0;
    this.itemStart = 0;
    this.lineNo = 0;
    this.columnNo = 0;
    this.leading = true;
    this.leader = '';
}

Scanner.prototype.next = function next(text) {
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (debug) {
            console.error('SCAN', i, JSON.stringify(c));
        }
        if (c === '\t') {
            this.columnNo = nextTabStop(this.columnNo);
        } else if (c === '\n') {
            if (this.leading) {
                this.indentStart = i;
            }
            this.leading = true;
            this.generator.next(text.slice(this.indentStart, i), this);
            this.columnNo = 0;
            this.lineNo++;
            this.lineStart = i + 1;
            this.leader = '';
        } else if (c === ' ') {
            this.columnNo++;
        } else if (this.leading && (c === '-' || c === '+' || c === '*')) {
            this.leader += c;
            this.columnNo++;
        } else {
            this.indent = this.columnNo;
            this.indentStart = i;
            this.columnNo++;
            this.leading = false;
        }
    }
    // TODO deal with remainder without \n
};

Scanner.prototype.return = function _return() {
    this.generator.return(this);
};

function nextTabStop(columnNo) {
    // TODO simplify with modulo arithmetic
    return Math.floor((columnNo + tabWidth) / tabWidth) * tabWidth;
}
