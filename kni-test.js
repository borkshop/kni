'use strict';

var fs = require('fs');
var rimraf = require('rimraf'); // TODO fs.rm in node v14
var runKni = require('./kni');

function runArgs(args, outfile, done) {
    var out = fs.createWriteStream(outfile);
    runKni(args, out, function runDone(err) {
        done(err ? new Error(JSON.stringify(args) + ' failed: ' + err) : null);
    });
}

function withTempDir(name, fn, done) {
    var cleaned = name.replace(/[^\w.]+/, '_');
    fs.mkdtemp(cleaned + '-', function maybeTempDir(err, dir) {
        if (err) {
            done(err);
            return;
        }
        fn(dir, function funDone(err) {
            rimraf(dir, fs, function rmDone(rmErr) {
                done(err || rmErr);
            });
        });
    });
}

function testBasic(kniscript, transcript, done) {
    withTempDir(transcript, function under(dir, fin) {
        var outfile = dir + '/out';
        runArgs([kniscript, '-v', transcript], outfile, fin);
    }, done);
}

function main() {
    [
        ['basic', testBasic],
    ].forEach(function eachTestMode(testMode) {
        var testModeName = testMode[0];
        var runTest = testMode[1];
        [
            // TODO reconcile table with engine-test.js
            ['hello.kni', 'tests/hello.1'],
        ].forEach(function eachTestCase(testCase) {
            var kniscript = testCase[0];
            var transcript = testCase[1];
            runTest(kniscript, transcript, function testRunDone(err) {
                if (err) {
                    process.exitCode |= 1;
                    console.log('FAIL', testModeName, kniscript, transcript, err);
                }
            });
        });
    });
}

main();
