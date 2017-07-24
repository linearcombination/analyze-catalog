const _ = require('lodash');

const getFileExtension = str => str.split('.').reverse()[0];

const pickShorterSlug = (slug1, slug2) => {
  if (!slug1) return slug2;
  if (!slug2) return slug1;
  return slug1.length < slug2.length ? slug1 : slug2;
};

const concatReduceToMap = (a, b, fn) => {
  const c = a ? a.concat(b) : b.concat(a);
  return c.reduce((m, entry) => {
    const map = _.cloneDeep(m);
    return fn(map, entry);
  }, {});
};

const revertMapToList = (map, fn) => Object.keys(map)
  .sort()
  .map(entry => fn(map, entry));

module.exports = {
  getFileExtension,
  pickShorterSlug,
  concatReduceToMap,
  revertMapToList,
};
