/**
 * Path utilities for navigating the story graph.
 * A path is an array starting with a label string, followed by various
 * strings and numeric indices.
 * For example: ['start', 0] or ['start', 'label', 1, 2]
 */

/** @typedef {[string, ...(string | number)[]]} Path */

/**
 * Creates the initial path for the start of a story.
 * @returns {Path}
 */
export const start = () => {
  return ['start'];
};

/**
 * Converts a path to a node name string.
 * @param {Path} path
 * @returns {string}
 */
export const toName = path => {
  let name = path[0];
  let i;
  for (i = 1; i < path.length - 1; i++) {
    name += `.${path[i]}`;
  }
  const last = path[i];
  if (path.length > 1 && last !== 0) {
    name += `.${last}`;
  }
  return name;
};

/**
 * Returns the path to the next sibling node.
 * @param {Path} path
 * @returns {Path}
 */
export const next = path => {
  /** @type {Path} */
  const result = /** @type {Path} */ (path.slice());
  // @ts-ignore - we know the last element is a number
  result[result.length - 1]++;
  return result;
};

/**
 * Returns the path to the first child (index 1).
 * @param {Path} path
 * @returns {Path}
 */
export const firstChild = path => {
  /** @type {Path} */
  const result = /** @type {Path} */ (path.slice());
  result.push(1);
  return result;
};

/**
 * Returns the path to the zeroth child (index 0).
 * @param {Path} path
 * @returns {Path}
 */
export const zerothChild = path => {
  /** @type {Path} */
  const result = /** @type {Path} */ (path.slice());
  result.push(0);
  return result;
};
