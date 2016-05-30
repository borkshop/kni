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
    function answer(text) {
        self.answer(text);
    }
}

Interlocutor.prototype.question = function question() {
    this.readline.question('> ', this.boundAnswer);
};

Interlocutor.prototype.answer = function answer(text) {
    this.engine.answer(text);
};

Interlocutor.prototype.close = function close() {
    this.readline.close();
};
