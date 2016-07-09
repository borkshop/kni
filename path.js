'use strict';

exports.start = start;

function start() {
    return ['start'];
}

exports.toName = pathToName;

function pathToName(path) {
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

exports.next = nextPath;

function nextPath(path) {
    path = path.slice();
    path[path.length - 1]++;
    return path;
}

exports.firstChild = firstChildPath;

function firstChildPath(path) {
    path = path.slice();
    path.push(1);
    return path;
}

exports.zerothChild = zerothChildPath;

function zerothChildPath(path) {
    path = path.slice();
    path.push(0);
    return path;
}
