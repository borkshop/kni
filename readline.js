'use strict';

var readline = require('readline');
var fs = require('fs');

module.exports = Readline;

function Readline(transcript, filename) {
    var self = this;
    this.readline = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    this.engine = null;
    this.boundAnswer = answer;
    this.transcript = transcript;
    this.state = new Play(this, filename);
    Object.seal(this);
    function answer(text) {
        self.answer(text);
    }
}

Readline.prototype.ask = function ask(question) {
    this.readline.question(question || '> ', this.boundAnswer);
};

Readline.prototype.answer = function answer(text) {
    if (this.transcript) {
        this.transcript.write('> ' + text + '\n');
    }
    this.state = this.state.answer(text);
};

Readline.prototype.close = function close() {
    if (this.transcript) {
        this.transcript.write('\n');
    }
    this.readline.close();
};

function Play(readline, filename) {
    this.readline = readline;
    this.filename = filename || 'inkblot.save';
}

Play.prototype.answer = function answer(text) {
    var engine = this.readline.engine;

    if (text === 'quit') {
        console.log("");
        engine.dialog.close();
    // istanbul ignore next
    } else if (text === 'bt') {
        engine.bt();
    // istanbul ignore next
    } else if (text === 'save') {
        console.log("");
        engine.dialog.ask('file name [' + this.filename + ']> ');
        return new Save(this, engine.waypoint);
    } else if (text === 'load') {
        console.log("");
        engine.dialog.ask('file name [' + this.filename + ']> ');
        return new Load(this, this.filename);
    } else {
        engine.answer(text);
    }
    return this;
};

Play.prototype.saved = function saved(filename) {
    var engine = this.readline.engine;

    this.filename = filename;
    engine.ask();
    return this;
};

Play.prototype.loaded = function loaded(waypoint) {
    var engine = this.readline.engine;

    engine.restore(waypoint);
    return this;
};

function Save(parent, waypoint) {
    this.parent = parent;
    this.waypoint = waypoint;
}

Save.prototype.answer = function answer(filename) {
    var waypoint = JSON.stringify(this.waypoint);
    fs.writeFileSync(filename, waypoint, 'utf8');

    console.log("");
    console.log("Waypoint written to " + filename);
    console.log(waypoint);
    console.log("");
    return this.parent.saved(filename);
};

function Load(parent, filename) {
    this.parent = parent;
    this.filename = filename;
}

Load.prototype.answer = function answer(filename) {
    filename = filename || this.filename;

    var waypoint = fs.readFileSync(filename, 'utf8');
    console.log("");
    console.log("Loaded from " + filename);
    console.log(waypoint);
    console.log("");

    return this.parent.loaded(JSON.parse(waypoint));
};
