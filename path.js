// @ts-check

'use strict';

/** A path is a story label optionally with a variable number of ids.
 * The label may be a dotted string containing sub-labels within each dotted level.
 * Any ids count nodes within the grammar subtree under label.
 *
 * @typedef {[string, ...number[]]} Path
 */

/** Creates the Path where all stories start from.
 *
 * @returns {Path}
 */
exports.start = function start() {
    return ['start'];
}


/** Converts a path to a dotted string like "lab.el.1.2.3"
 *
 * @param {Path} path
 * @returns {string}
 */
exports.toName = function pathToName(path) {
    var name = path[0];
    var i;
    for (i = 1; i < path.length - 1; i++) {
        name += '.' + path[i];
    }
    var last = path[i];
    if (path.length > 1 && last !== 0) {
        name += '.' + last;
    }
    return name;
}

/** Constructs a sibling path, incrementing the last id from the given path.
 * If the given path is label-only, simply returns the given path unchanged.
 *
 * @param {Path} path
 * @returns {Path}
 */
exports.next = function nextPath(path) {
    const [label, ...ids] = path;
    if (ids.length > 0) {
        ids[ids.length-1]++;
        return [label, ...ids];
    }
    return path;
}

/** Constructs a child path by appending a 1 id to a copy of the given path.
 *
 * @param {string|Path} path
 * @returns {Path} -- a copy of path with an added 1 id
 */
exports.firstChild = function firstChildPath(path) {
    return typeof path === 'string' ? [path, 1] : [...path, 1];
}


/** Constructs a child path by appending a 0 id to a copy of the given path.
 *
 * @param {string|Path} path
 * @returns {Path} -- a copy of path with an added 0 id
 */
exports.zerothChild = function zerothChildPath(path) {
    return typeof path === 'string' ? [path, 0] : [...path, 0];
}
