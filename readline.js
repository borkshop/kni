'use strict';

var readline = require('readline');

module.exports = Interlocutor;

function Interlocutor(transcript) {
    var self = this;
    this.readline = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    this.engine = null;
    this.boundAnswer = answer;
    this.transcript = transcript;
    Object.seal(this);
    function answer(text) {
        self.answer(text);
    }
}

Interlocutor.prototype.question = function question() {
    this.readline.question('> ', this.boundAnswer);
};

Interlocutor.prototype.answer = function answer(text) {
    if (this.transcript) {
        this.transcript.write('> ' + text + '\n');
    }
    this.engine.answer(text);
};

Interlocutor.prototype.close = function close() {
    if (this.transcript) {
        this.transcript.write('\n');
    }
    this.readline.close();
};
