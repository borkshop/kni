'use strict';

const start = () => {
  return ['start'];
};
exports.start = start;

const pathToName = path => {
  let name = path[0];
  let i;
  for (i = 1; i < path.length - 1; i++) {
    name += '.' + path[i];
  }
  const last = path[i];
  if (path.length > 1 && last !== 0) {
    name += '.' + last;
  }
  return name;
};
exports.toName = pathToName;

const nextPath = path => {
  path = path.slice();
  path[path.length - 1]++;
  return path;
};
exports.next = nextPath;

const firstChildPath = path => {
  path = path.slice();
  path.push(1);
  return path;
};
exports.firstChild = firstChildPath;

const zerothChildPath = path => {
  path = path.slice();
  path.push(0);
  return path;
};
exports.zerothChild = zerothChildPath;
