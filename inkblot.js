#!/usr/bin/env node

'use strict';

var fs = require('fs');
var ReadlineEngine = require('./engine');
var Scanner = require('./scanner');
var Lexer = require('./lexer');
var LineLexer = require('./line-lexer');
var grammar = require('./grammar');
var exec = require('shon/exec');
var usage = require('./inkblot.json');

function main() {
    var config = exec(usage);

    if (!config) {
        return;
    }

    read(config.script, 'utf8', onScript);

    function onScript(err, ink) {
        if (err) {
            return;
        }

        // console.log(ink);

        var story = {};
        var p = grammar.start();
        var ll = new LineLexer(p);
        var l = new Lexer(ll);
        var s = new Scanner(l);
        s.next(ink);
        s.return();

        // console.log(JSON.stringify(ll.generator, null, 4));

        if (ll.generator.prev) {
            ll.generator.prev.write(story, 'end');
            story.end = {type: 'end'};
        } else {
            story.start = {type: 'end'};
        }

        if (config.json) {
            console.log(JSON.stringify(story, null, 4));
        } else {
            var engine = new ReadlineEngine(story, config.start);
            engine.continue();
        }
    }

}

function read(stream, encoding, callback) {
    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onEnd);
    stream.setEncoding(encoding);
    var string = '';
    function onData(chunk) {
        string += chunk;
    }
    function onEnd(err) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, string);
    }
}

main();

