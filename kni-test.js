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
 * @returns {DiffResult}
 */
function diffFiles(a, b) {
  const aData = stripAnsi(fs.readFileSync(a, 'utf8'));
  const bData = stripAnsi(fs.readFileSync(b, 'utf8'));
  return {
    same: aData === bData,
    aData,
    bData,
  };
}

/**
 * @param {string[]} args
 * @param {string} outfile
 * @returns {Promise<void>}
 */
async function runArgs(args, outfile) {
  const out = fs.createWriteStream(outfile);

  // Wait for the stream to be ready
  await new Promise((resolve, reject) => {
    out.on('open', resolve);
    out.on('error', reject);
  });

  try {
    // @ts-ignore - WriteStream is compatible with Writer
    await runKni(args, out);
  } finally {
    // Close the stream and wait for it to finish
    await new Promise((resolve, reject) => {
      out.on('close', resolve);
      out.on('error', reject);
      out.end();
    });
  }
}

/**
 * @template T
 * @param {string} name
 * @param {(dir: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTempDir(name, fn) {
  const cleaned = name.replace(/[^\w.]+/, '_');
  const dir = fs.mkdtempSync(`${cleaned}-`);
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, {recursive: true});
  }
}

/**
 * @param {string} kniscript
 * @param {string} transcript
 * @returns {Promise<void>}
 */
async function testBasic(kniscript, transcript) {
  await withTempDir(transcript, async dir => {
    const outfile = `${dir}/out`;
    await runArgs([kniscript, '-v', transcript], outfile);
  });
}

/**
 * @param {string} kniscript
 * @param {string} descript
 * @returns {Promise<void>}
 */
async function testDescribe(kniscript, descript) {
  await withTempDir(descript, async dir => {
    const outfile = `${dir}/out`;
    await runArgs([kniscript, '-d'], outfile);
    const res = diffFiles(descript, outfile);
    if (!res.same) {
      console.log('aBytes', res.aData.length);
      console.log('bBytes', res.bData.length);
      console.log('aLines', res.aData.split(/\n/));
      console.log('bLines', res.bData.split(/\n/));
      throw new Error('output does not match');
    }
  });
}

async function main() {
  const files = fs.readdirSync('tests');

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
    if (nom === 'hello') {
      return 'hello.kni';
    }
    return `examples/${nom}.kni`;
  }

  // description tests
  /** @type {[string, string][]} */
  const describeTests = files
    .map(file => {
      const kniscript = kniFor(file);
      if (!kniscript || !/\.desc$/.test(file)) {
        return null;
      }
      return /** @type {[string, string]} */ ([kniscript, `tests/${file}`]);
    })
    .filter(/** @type {(x: [string, string] | null) => x is [string, string]} */ (x => x != null));

  for (const [kniscript, descript] of describeTests) {
    try {
      await testDescribe(kniscript, descript);
    } catch (err) {
      process.exitCode = 1;
      console.log('FAIL', 'describe', kniscript, descript, err);
    }
  }

  // verification tests
  /** @type {[string, typeof testBasic][]} */
  const testModes = [
    // TODO also derive from files and/or reconcile with engine-test
    ['basic', testBasic],
  ];

  for (const [testModeName, runTest] of testModes) {
    /** @type {[string, string][]} */
    const testCases = [
      // TODO reconcile table with engine-test.js
      ['hello.kni', 'tests/hello.1'],
    ];
    for (const [kniscript, transcript] of testCases) {
      try {
        await runTest(kniscript, transcript);
      } catch (err) {
        process.exitCode = 1;
        console.log('FAIL', testModeName, kniscript, transcript, err);
      }
    }
  }
}

main();
