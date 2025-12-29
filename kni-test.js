import * as fs from 'fs';
import runKni from './kni.js';
// @ts-ignore - no types
import stripAnsi from 'strip-ansi';

/**
 * @typedef {object} DiffResult
 * @prop {boolean} same
 * @prop {string} aData
 * @prop {string} bData
 */

/**
 * @param {string} a
 * @param {string} b
 * @param {(err: NodeJS.ErrnoException | null, result?: DiffResult) => void} done
 */
function diffFiles(a, b, done) {
  fs.readFile(a, 'utf8', function aRead(err, aData) {
    if (err) {
      done(err);
      return;
    }
    fs.readFile(b, 'utf8', function bRead(err, bData) {
      if (err) {
        done(err);
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

/**
 * @param {string[]} args
 * @param {string} outfile
 * @param {(err: Error | null) => void} done
 */
function runArgs(args, outfile, done) {
  const out = fs.createWriteStream(outfile);
  // @ts-ignore - WriteStream is compatible with Writer
  runKni(args, out, function runDone(err) {
    done(err ? new Error(`${JSON.stringify(args)} failed: ${err}`) : null);
  });
}

/**
 * @param {string} name
 * @param {(dir: string, done: (err: Error | null) => void) => void} fn
 * @param {(err: Error | null) => void} done
 */
function withTempDir(name, fn, done) {
  const cleaned = name.replace(/[^\w.]+/, '_');
  fs.mkdtemp(`${cleaned}-`, function maybeTempDir(err, dir) {
    if (err) {
      done(err);
      return;
    }
    fn(dir, function funDone(err) {
      fs.rm(dir, {recursive: true}, function rmDone(rmErr) {
        done(err || rmErr);
      });
    });
  });
}

/**
 * @param {string} kniscript
 * @param {string} transcript
 * @param {(err: Error | null) => void} done
 */
function testBasic(kniscript, transcript, done) {
  withTempDir(
    transcript,
    function under(dir, fin) {
      const outfile = `${dir}/out`;
      runArgs([kniscript, '-v', transcript], outfile, fin);
    },
    done
  );
}

/**
 * @param {string} kniscript
 * @param {string} descript
 * @param {(err: Error | null) => void} done
 */
function testDescribe(kniscript, descript, done) {
  withTempDir(
    descript,
    function under(dir, fin) {
      const outfile = `${dir}/out`;
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
          if (!res || !res.same) {
            console.log('aBytes', res?.aData.length);
            console.log('bBytes', res?.bData.length);

            console.log('aLines', res?.aData.split(/\n/));
            console.log('bLines', res?.bData.split(/\n/));

            fin(new Error('output does not match'));
            return;
          }
          fin(null);
        });
      });
    },
    done
  );
}

function main() {
  fs.readdir('tests', function (err, files) {
    if (err) {
      process.exitCode = 1;
      console.error('unable to read tests dir');
      return;
    }

    /**
     * @param {string} somescript
     * @returns {string}
     */
    function kniFor(somescript) {
      const match = /(.+)\./.exec(somescript);
      const nom = match && match[1];
      if (!nom) {
        return '';
      }
      if (nom == 'hello') {
        return 'hello.kni';
      }
      return `examples/${nom}.kni`;
    }

    // description tests
    files
      .map(function (file) {
        const kniscript = kniFor(file);
        if (!kniscript || !/\.desc$/.test(file)) {
          return null;
        }
        return [kniscript, `tests/${file}`];
      })
      .filter(function (testCase) {
        return testCase != null;
      })
      .forEach(function eachTestCase(testCase) {
        if (!testCase) return;
        const kniscript = testCase[0];
        const descript = testCase[1];
        testDescribe(kniscript, descript, function testRunDone(err) {
          if (err) {
            process.exitCode = 1;
            console.log('FAIL', 'describe', kniscript, descript, err);
          }
        });
      });

    // verification tests
    /** @type {[string, typeof testBasic][]} */
    const testModes = [
      // TODO also derive from files and/or reconcile with engine-test
      ['basic', testBasic],
    ];
    testModes.forEach(function eachTestMode(testMode) {
      const testModeName = testMode[0];
      const runTest = testMode[1];
      /** @type {[string, string][]} */
      const testCases = [
        // TODO reconcile table with engine-test.js
        ['hello.kni', 'tests/hello.1'],
      ];
      testCases.forEach(function eachTestCase(testCase) {
        const kniscript = testCase[0];
        const transcript = testCase[1];
        runTest(kniscript, transcript, function testRunDone(err) {
          if (err) {
            process.exitCode = 1;
            console.log('FAIL', testModeName, kniscript, transcript, err);
          }
        });
      });
    });
  });
}

main();
