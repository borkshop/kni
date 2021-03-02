'use strict';

var fs = require('fs');
var rimraf = require('rimraf'); // TODO fs.rm in node v14
var runKni = require('./kni');
var stripAnsi = require('strip-ansi');

// TODO better file diffing
function diffFiles(a, b, done) {
    fs.readFile(a, 'utf8', function aRead(err, aData) {
        if (err) {
            done(err, null);
            return;
        }
        fs.readFile(b, 'utf8', function bRead(err, bData) {
            if (err) {
                done(err, null);
                return;
            }
            aData = stripAnsi(aData);
            bData = stripAnsi(bData);
            done(null, {
                same: aData == bData,
                aData: aData,
                bData: bData,
            });
        });
    });
}

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

function testDescribe(kniscript, descript, done) {
    withTempDir(descript, function under(dir, fin) {
        var outfile = dir + '/out';
        runArgs([kniscript, '-d'], outfile, function runDone(err) {
            if (err) {
                fin(err);
                return;
            }
            diffFiles(descript, outfile, function diffed(err, res) {
                if (err) {
                    fin(err);
                    return;
                }
                if (!res.same) {

                    console.log('aBytes', res.aData.length);
                    console.log('bBytes', res.bData.length);

                    console.log('aLines', res.aData.split(/\n/));
                    console.log('bLines', res.bData.split(/\n/));

                    fin(new Error('output does not match'));
                    return;
                }
                fin(null);
            });
        });
    }, done);
}

function testCompiledJson(kniscript, transcript, done) {
    withTempDir(transcript, function under(dir, fin) {
        var outfile = dir + '/out';
        var jsonfile = dir + '/json';
        runArgs([kniscript, '-j'], jsonfile, function compileDone(err) {
            if (err) {
                fin(err);
                return;
            }
            runArgs(['-J', jsonfile, '-v', transcript], outfile, fin);
        });
    }, done);
}

function main() {
    fs.readdir('tests', function(err, files) {
        if (err) {
            process.exitCode |= 1;
            console.error('unable to read tests dir');
            return;
        }

        function kniFor(somescript) {
            var match = /(.+)\./.exec(somescript);
            var nom = match && match[1];
            if (!nom) {
                return '';
            }
            if (nom == 'hello') {
                return 'hello.kni';
            }
            return 'examples/' + nom + '.kni';
        }

        // description tests
        files
            .map(function(file) {
                var kniscript = kniFor(file);
                if (!kniscript || !/\.desc$/.test(file)) {
                    return null;
                }
                return [kniscript, 'tests/' + file];
            })
            .filter(function(testCase) { return testCase != null })
            .forEach(function eachTestCase(testCase) {
                var kniscript = testCase[0];
                var descript = testCase[1];
                testDescribe(kniscript, descript, function testRunDone(err) {
                    if (err) {
                        process.exitCode |= 1;
                        console.log('FAIL', 'describe', kniscript, descript, err);
                    }
                });
            });

        // verification tests
        [
            ['basic', testBasic],
            ['compiledJson', testCompiledJson],
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

    });
}

main();
