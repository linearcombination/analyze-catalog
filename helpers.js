const books = require('./books.json');
const contentOrder = require('./content_order.json');

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

/**
 *
 */
function unNestSubcontent(contentCodes, contents) {
  return contentCodes.reduce((acc, code) => {
    const targetContents = acc.filter(content => content.code === code);
    const restOfContents = acc.filter(content => content.code !== code);

    return targetContents
      .map(content => Object.assign({}, content, {
        name: content.subcontents[0].name,
        links: content.subcontents[0].links.slice(),
        subcontents: content.subcontents.slice(1),
      }))
      .concat(restOfContents);
  }, contents.slice());
}

/**
 *
 */
function orderContent(contents) {
  const orderedContents = [];

  contents.forEach((content) => {
    const order = contentOrder[content.code];
    let offset = 0;

    if (order >= 0) {
      orderedContents[order + offset] = content;
    } else {
      orderedContents.unshift(content);
      offset += 1;
    }
  });

  // Filter out the empty in-between spaces
  return orderedContents.filter(content => content);
}

/**
 *
 */
function getCategory(bookCode) {
  const code = bookCode.toLowerCase();
  return (books[code] && `bible-${books[code].anth}`) || '';
}

module.exports = {
  getFileFormat,
  pickShorterSlug,
  concatReduceToMap,
  getZipContent,
  unNestSubcontent,
  orderContent,
  getCategory,
};
