'use strict';

// Transforms a stream of text into a sequence of 'lines', tracking each line's
// level of indentation.

// The scanner feeds into an outline lexer.

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
    this.debug = debug;
}

Scanner.prototype.next = function next(text) {
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        var d = text[i + 1];
        // istanbul ignore if
        if (this.debug) {
            console.error('SCN', this.position() + ':' + i, JSON.stringify(c + d));
        }
        if (
            ((c === '\t' || c === ' ') && d === '#') ||
            (this.columnNo === 0 && c === '#')
        ) {
            this.newLine(text, i);
            for (i++; i < text.length; i++) {
                c = text[i];
                if (c === '\n') {
                    break;
                }
            }
        } else if (c === '\t') {
            this.columnNo = nextTabStop(this.columnNo);
        } else if (c === '\n') {
            this.newLine(text, i);
        } else if (c === ' ') {
            this.columnNo++;
        } else if (
            this.leading &&
            (c === '-' || c === '+' || c === '*') &&
            (d === ' ' || d === '\t')
        ) {
            this.leader += c;
            this.columnNo++;
        } else if (this.leading) {
            this.indent = this.columnNo;
            this.indentStart = i;
            this.columnNo++;
            this.leading = false;
        }
    }

    if (!this.leading) {
        this.generator.next(text.slice(this.indentStart, i), this);
    }
};

Scanner.prototype.newLine = function newLine(text, i) {
    if (this.leading) {
        this.indentStart = i;
    }
    this.leading = true;
    this.generator.next(text.slice(this.indentStart, i), this);
    this.columnNo = 0;
    this.lineNo++;
    this.lineStart = i + 1;
    this.leader = '';
};

Scanner.prototype.return = function _return() {
    this.generator.return(this);
};

// istanbul ignore next
Scanner.prototype.position = function position() {
    return (this.lineNo + 1) + ':' + (this.columnNo + 1);
};

function nextTabStop(columnNo) {
    // TODO simplify with modulo arithmetic
    return Math.floor((columnNo + tabWidth) / tabWidth) * tabWidth;
}
