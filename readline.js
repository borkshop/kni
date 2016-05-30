'use strict';

var readline = require('readline');

module.exports = Interlocutor;

function Interlocutor() {
    var self = this;
    this.readline = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    this.engine = null;
    this.boundAnswer = answer;
    Object.seal(this);
    function answer(answer) {
        self.answer(answer);
    }
}

Interlocutor.prototype.question = function question() {
    this.readline.question('> ', this.boundAnswer);
};

Interlocutor.prototype.answer = function answer(answer) {
    this.engine.answer(answer);
};

Interlocutor.prototype.close = function close() {
    this.readline.close();
};