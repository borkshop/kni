'use strict';

var readline = require('readline');
var fs = require('fs');

module.exports = class Readline {
    constructor(transcript, filename) {
        var self = this;
        this.readline = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.engine = null;
        this.boundAnswer = answer;
        this.transcript = transcript;
        this.history = [];
        this.state = new Play(this, filename);
        Object.seal(this);
        function answer(text) {
            self.answer(text);
        }
    }

    ask(cue) {
        this.readline.question((cue || '') + '> ', this.boundAnswer);
    }

    answer(text) {
        if (this.transcript) {
            this.transcript.write('> ' + text + '\n');
        }
        this.state = this.state.answer(text);
    }

    close() {
        if (this.transcript) {
            this.transcript.write('\n');
        }
        this.readline.close();
    }
};

class Play {
    constructor(readline, filename) {
        this.readline = readline;
        this.filename = filename || 'kni.waypoint';
    }

    answer(text) {
        var engine = this.readline.engine;

        if (text === 'quit') {
            console.log('');
            engine.dialog.close();
        } else if (text === 'bt' || text === 'trace') {
            engine.log();
            engine.ask();
        } else if (text === 'capture' || text === 'cap') {
            console.log(JSON.stringify(engine.waypoint));
            console.log('');
            engine.ask();
        } else if (text === 'save') {
            console.log('');
            engine.dialog.ask('file name [' + this.filename + ']> ');
            return new Save(this, engine.waypoint, this.filename);
        } else if (text === 'load') {
            console.log('');
            engine.dialog.ask('file name [' + this.filename + ']> ');
            return new Load(this, this.filename);
        } else if (text === 'back') {
            console.log('');
            if (this.readline.transcript) {
                this.readline.transcript.write('\n');
            }
            if (this.readline.history.length <= 1) {
                console.log('Meanwhile, at the beginning of recorded history...');
            }
            engine.waypoint = this.readline.history.pop();
            engine.resume(engine.waypoint);
        } else if (text === 'replay') {
            console.log('');
            if (this.readline.transcript) {
                this.readline.transcript.write('\n');
            }
            engine.resume(engine.waypoint);
        } else {
            this.readline.history.push(engine.waypoint);
            engine.answer(text);
        }
        return this;
    }

    saved(filename) {
        var engine = this.readline.engine;

        this.filename = filename;
        engine.ask();
        return this;
    }

    loaded(waypoint) {
        var engine = this.readline.engine;

        engine.resume(waypoint);
        return this;
    }
}

class Save {
    constructor(parent, waypoint, filename) {
        this.parent = parent;
        this.waypoint = waypoint;
        this.filename = filename;
    }

    answer(filename) {
        var waypoint = JSON.stringify(this.waypoint);
        filename = filename || this.filename;
        fs.writeFileSync(filename, waypoint, 'utf8');

        console.log('');
        console.log('Waypoint written to ' + filename);
        console.log(waypoint);
        console.log('');
        return this.parent.saved(filename);
    }
}

class Load {
    constructor(parent, filename) {
        this.parent = parent;
        this.filename = filename;
    }

    answer(filename) {
        filename = filename || this.filename;

        var waypoint = fs.readFileSync(filename, 'utf8');
        console.log('');
        console.log('Loaded from ' + filename);
        console.log(waypoint);
        console.log('');

        return this.parent.loaded(JSON.parse(waypoint));
    }
}
