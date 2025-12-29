import * as Path from './path.js';

/** @import { Path as PathType } from './path.js' */
/** @import { default as Story } from './story.js' */
/** @import { Linkable, StoryNode, BranchWrapper } from './grammar-types' */

/**
 * Scope tracks the current position in the story graph during parsing.
 * It provides methods for creating nodes and navigating the graph structure.
 */
export default class Scope {
  /**
   * Ties an array of linkable nodes to a target name.
   * For Branch wrappers, ties the 'branch' property; otherwise ties 'next'.
   * @param {Linkable[]} ends
   * @param {string} [name]
   */
  static tie(ends, name) {
    for (let i = 0; i < ends.length; i++) {
      const end = ends[i];
      if (/** @type {BranchWrapper} */ (end).type === 'branch') {
        /** @type {BranchWrapper} */ (end).node.branch = name || 'RET';
      } else {
        /** @type {StoryNode} */ (end).next = name || 'RET';
      }
    }
  }

  /**
   * @param {Story} story
   * @param {PathType} path
   * @param {PathType} base
   */
  constructor(story, path, base) {
    this.story = story;
    this.path = path;
    this.base = base;
    Object.seal(this);
  }

  /**
   * Returns the name of the current node.
   * @returns {string}
   */
  name() {
    return Path.toName(this.path);
  }

  /**
   * Creates a new story node at the current path.
   * @param {string} type - The node type (text, echo, option, etc.)
   * @param {any} arg - Constructor argument for the node
   * @param {string | null} position - Source position string
   * @returns {any} The created node
   */
  create(type, arg, position) {
    return this.story.create(this.path, type, arg, position);
  }

  /**
   * Returns a scope for the next sibling node.
   * @returns {Scope}
   */
  next() {
    return new Scope(this.story, Path.next(this.path), this.base);
  }

  /**
   * Returns a scope for the zeroth child node.
   * @returns {Scope}
   */
  zerothChild() {
    return new Scope(this.story, Path.zerothChild(this.path), this.base);
  }

  /**
   * Returns a scope for the first child node.
   * @returns {Scope}
   */
  firstChild() {
    return new Scope(this.story, Path.firstChild(this.path), this.base);
  }

  /**
   * Returns a scope for a labeled section.
   * @param {string} label
   * @returns {Scope}
   */
  label(label) {
    return new Scope(this.story, /** @type {PathType} */ (this.base.concat([label, 0])), this.base);
  }

  /**
   * Ties an array of nodes to the current scope's name.
   * @param {Linkable[]} nodes
   */
  tie(nodes) {
    Scope.tie(nodes, this.name());
  }

  /**
   * Reports an error through the story.
   * @param {string} message
   */
  error(message) {
    this.story.error(message);
  }
}
