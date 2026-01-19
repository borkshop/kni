/** @import { Expression } from './grammar-types' */

/**
 * Scope interface for variable lookup.
 * @typedef {object} Scope
 * @prop {(name: string) => number} get
 */

/**
 * Randomer interface for random number generation.
 * @typedef {object} Randomer
 * @prop {() => number} random
 */

/**
 * Evaluates an expression AST node.
 * @param {Scope} scope
 * @param {Randomer} randomer
 * @param {Expression} args
 * @returns {number}
 */
const evaluate = (scope, randomer, args) => {
  const name = /** @type {string} */ (args[0]);
  if (unary[name] && args.length === 2) {
    return unary[name](
      evaluate(scope, randomer, /** @type {Expression} */ (args[1])),
      scope,
      randomer
    );
  } else if (binary[name] && args.length === 3) {
    return binary[name](
      evaluate(scope, randomer, /** @type {Expression} */ (args[1])),
      evaluate(scope, randomer, /** @type {Expression} */ (args[2])),
      scope,
      randomer
    );
  } else if (name === 'val') {
    return /** @type {number} */ (args[1]);
  } else if (name === 'get') {
    return scope.get(/** @type {string} */ (args[1]));
  } else if (name === 'var') {
    return scope.get(nominate(scope, randomer, args));
  } else if (name === 'call') {
    const func = /** @type {Expression} */ (args[1])[1];
    const f = functions[/** @type {string} */ (func)];
    if (!f) {
      // TODO thread line number for containing instruction
      throw new Error(`No function named ${func}`);
    }
    const values = [];
    for (let i = 2; i < args.length; i++) {
      values.push(evaluate(scope, randomer, /** @type {Expression} */ (args[i])));
    }
    return f.apply(null, values);
  } else {
    throw new Error(`Unexpected operator ${JSON.stringify(args)}`);
  }
};

/**
 * Builds a variable name from a var expression with interpolation.
 * @param {Scope} scope
 * @param {Randomer} randomer
 * @param {Expression} args
 * @returns {string}
 */
const nominate = (scope, randomer, args) => {
  if (args[0] === 'get') {
    return /** @type {string} */ (args[1]);
  }
  const literals = /** @type {string[]} */ (args[1]);
  const variables = /** @type {Expression[]} */ (args[2]);
  let name = '';
  let i;
  for (i = 0; i < variables.length; i++) {
    name += literals[i] + evaluate(scope, randomer, variables[i]);
  }
  name += literals[i];
  return name;
};
evaluate.nominate = nominate;

/** @type {Record<string, (...args: number[]) => number>} */
const functions = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan2: Math.atan2,
  atan: Math.atan,
  exp: Math.exp,
  log: Math.log,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  sin: Math.sin,
  tan: Math.tan,

  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,

  sign: x => {
    if (x < 0) {
      return -1;
    }
    if (x > 0) {
      return 1;
    }
    return 0;
  },

  mean: function (...args) {
    let mean = 0;
    for (let i = 0; i < args.length; i++) {
      mean += args[i];
    }
    return mean / args.length;
  },

  root: (x, y) => {
    if (y === 2 || y == null) {
      return Math.sqrt(x);
    }
    return Math.pow(x, 1 / y);
  },

  distance: (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  },

  manhattan: (x1, y1, x2, y2) => {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  },
};

/** @type {Record<string, (x: number, y: number, scope: Scope, randomer: Randomer) => number>} */
const binary = {
  '+': (x, y) => {
    return x + y;
  },
  '-': (x, y) => {
    return x - y;
  },
  '*': (x, y) => {
    return x * y;
  },
  '/': (x, y) => {
    return (x / y) >> 0;
  },
  '%': (x, y) => {
    return ((x % y) + y) % y;
  },
  '**': (x, y) => {
    return Math.pow(x, y);
  },
  or: (x, y) => {
    return x || y ? 1 : 0;
  },
  and: (x, y) => {
    return x && y ? 1 : 0;
  },
  '>=': (x, y) => {
    return x >= y ? 1 : 0;
  },
  '>': (x, y) => {
    return x > y ? 1 : 0;
  },
  '<=': (x, y) => {
    return x <= y ? 1 : 0;
  },
  '<': (x, y) => {
    return x < y ? 1 : 0;
  },
  '==': (x, y) => {
    return x === y ? 1 : 0;
  },
  '<>': (x, y) => {
    return x != y ? 1 : 0;
  },
  '#': (x, y) => {
    return hilbert(x, y);
  },
  '~': (x, y, _scope, randomer) => {
    let r = 0;
    for (let i = 0; i < x; i++) {
      r += randomer.random() * y;
    }
    return Math.floor(r);
  },
};

/** @type {Record<string, (x: number, scope: Scope, randomer: Randomer) => number>} */
const unary = {
  not: x => {
    return x ? 0 : 1;
  },
  '-': x => {
    return -x;
  },
  '~': (x, _scope, randomer) => {
    return Math.floor(randomer.random() * x);
  },
  '#': x => {
    return hash(x);
  },
};

/**
 * Robert Jenkins's 32 bit hash function
 * https://gist.github.com/badboy/6267743
 * @param {number} a
 * @returns {number}
 */
const hash = a => {
  a = a + 0x7ed55d16 + (a << 12);
  a = a ^ 0xc761c23c ^ (a >>> 19);
  a = a + 0x165667b1 + (a << 5);
  a = (a + 0xd3a2646c) ^ (a << 9);
  a = a + 0xfd7046c5 + (a << 3);
  a = a ^ 0xb55a4f09 ^ (a >>> 16);
  return a;
};
evaluate.hash = hash;

// hilbert in range from 0 to 2^32
// x and y in range from 0 to 2^16
// each dimension has origin at 2^15
const dimensionWidth = (-1 >>> 16) + 1;
const halfDimensionWidth = dimensionWidth / 2;

/**
 * Computes hilbert curve index for coordinates.
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
const hilbert = (x, y) => {
  x += halfDimensionWidth;
  y += halfDimensionWidth;
  let rx = 0;
  let ry = y;
  let scalar = 0;
  for (let scale = dimensionWidth; scale > 0; scale /= 2) {
    rx = x & scale;
    ry = y & scale;
    scalar += scale * ((3 * rx) ^ ry);
    // rotate
    if (!ry) {
      if (rx) {
        x = scale - 1 - x;
        y = scale - 1 - y;
      }
      // transpose
      const t = x;
      x = y;
      y = t;
    }
  }
  return scalar;
};

export default evaluate;
