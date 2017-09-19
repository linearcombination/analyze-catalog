/**
 * Returns the piece of string that comes after the last dot. Don't trust this
 * to get the real file type.
 */
const getFileFormat = str => str.split('.').reverse()[0];

/**
 * Returns the shorter of the 2 strings. Falsy value is considered an empty
 * string.
 */
const pickShorterSlug = (slug1, slug2) => {
  if (!slug1 && !slug2) return '';
  if (!slug1 && slug2) return slug2;
  if (!slug2 && slug1) return slug1;
  return slug1.length < slug2.length ? slug1 : slug2;
};

/**
 * Concatenate two arrays and reduce them to a map by running each entry through
 * the reducer (fn). The reducer must return an object.
 */
const concatReduceToMap = (a, b, fn) => {
  const c = a ? a.concat(b) : b.concat(a);
  return c.reduce((map, entry) => fn(map, entry), {});
};

/**
 * Convert ...
 *
 * {
 *   aa: { value: 1 },
 *   ab: { value: 2 }
 * }
 *
 * to ...
 *
 * [
 *   { keyName: 'aa', value: 1 },
 *   { keyName: 'ab', value: 0 }
 * ]
 */
// function mapToList(keyName) {
//   const map = this;
//   return Object.keys(map).sort().map(key => Object.assign({ [keyName]: key }, map[key]));
// }
// Object.prototype.mapToList = mapToList;

/**
 *
 */
function getZipContent(formatString) {
  const isZip = /application\/zip/.exec(formatString);
  if (!isZip) {
    return '';
  }

  // formatString will contain, for example: ... content=text/usfm
  const content = /content=[\w]+\/([\w]+)/.exec(formatString);
  return content[1];
}

module.exports = {
  getFileFormat,
  pickShorterSlug,
  concatReduceToMap,
  getZipContent,
};
