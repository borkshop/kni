export const start = () => {
  return ['start'];
};

export const toName = path => {
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

export const next = path => {
  path = path.slice();
  path[path.length - 1]++;
  return path;
};

export const firstChild = path => {
  path = path.slice();
  path.push(1);
  return path;
};

export const zerothChild = path => {
  path = path.slice();
  path.push(0);
  return path;
};
