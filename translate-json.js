/**
 * @typedef {object} Module
 * @prop {string} text
 */

/**
 * Transforms a module to wrap its text as a default export.
 * @param {Module} module
 */
export default module => {
  module.text = `export default ${module.text}`;
};
