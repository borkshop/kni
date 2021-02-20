// @ts-check

'use strict';

// Transforms a stream of text into a sequence of 'lines', tracking each line's
// level of indentation.
// Trims lines.
// Stips comments.
//
// The scanner feeds into an outline lexer.

const tabWidth = 4;

/**
 * @param {number} columnNo -- screen column number (logical X coord)
 * @returns {number} -- column number where the next tab stop starts
 */
function nextTabStop(columnNo) {
    // TODO simplify with modulo arithmetic
    return Math.floor((columnNo + tabWidth) / tabWidth) * tabWidth;
}

module.exports = class Scanner {
    leaders = '-+*!>'

    debug = typeof process === 'object' && process.env.DEBUG_SCANNER

    indent = 0
    lineStart = 0
    indentStart = 0
    itemStart = 0
    lineNo = 0
    columnNo = 0
    columnStart = 0
    leading = true
    leader = ''

    /** An Iterator-like object that has text pushed into it by a Scanner.
     *
     * Its biggest difference from an Iterator<string> is that the Scanner
     * object itself is passed along as an additional next agument
     *
     * @typedef {object} ScanIt
     * @prop {(text: string, sc: Scanner) => void} next
     * @prop {(sc: Scanner) => void} return
     */

    /**
     * @param {ScanIt} generator
     * @param {string} fileName
     */
    constructor(generator, fileName) {
        this.generator = generator;
        this.fileName = fileName || '-';
    }

    /**
     * @param {string} text
     * @returns {void}
     */
    next(text) {
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            var d = text[i + 1] || '';
            if (this.debug) {
                console.error('SCN', `${this.position()}:${i},${JSON.stringify(c + d)}`);
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
                this.leading && this.leaders.indexOf(c) >= 0 &&
                (d === ' ' || d === '\t')
            ) {
                this.leader += c;
                this.columnNo++;
            } else if (this.leading && this.leaders.indexOf(c) >= 0 && d === '\n') {
                this.leader += c;
                this.indentStart = i;
                this.columnStart = this.columnNo;
                this.lineStart = this.lineNo;
                this.indent = this.columnNo + 2;
            } else if (this.leading) {
                this.indent = this.columnNo;
                this.indentStart = i;
                this.columnStart = this.columnNo;
                this.lineStart = this.lineNo;
                this.columnNo++;
                this.leading = false;
            }
        }

        // TODO To exercise the following block, you need a file with no final
        // newline.
        if (!this.leading) {
            this.generator.next(text.slice(this.indentStart, i), this);
        }
    }

    /**
     * @param {string} text
     * @param {number} i
     * @returns {void}
     */
    newLine(text, i) {
        if (this.leading) {
            this.indentStart = i;
        }
        this.leading = true;
        this.generator.next(text.slice(this.indentStart, i), this);
        this.columnNo = 0;
        this.lineNo++;
        this.lineStart = i + 1;
        this.leader = '';
    }

    /**
     * @returns {void}
     */
    return() {
        this.generator.return(this);
    }

    position() {
        return `${this.fileName}:${this.lineNo + 1}:${this.columnStart + 1}`;
    }
}
