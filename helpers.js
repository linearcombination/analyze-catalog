const books = require('./data/books.json');
const contentOrder = require('./data/content_order.json');

/**
 * Returns the piece of string that comes after the last dot. Don't trust this
 * to get the real file type.
 */
function getFileFormat(fileName) {
  return fileName.split('.').reverse()[0];
}

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
function flattenOnce(arrayOfArrays) {
  return arrayOfArrays.reduce((all, array) => all.concat(array), []);
}

/**
 *
 */
function removeProperty(object, property) {
  const newObject = Object.assign({}, object);
  delete newObject[property];
  return newObject;
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

/**
 *
 */
function getBookSortOrder(bookCode) {
  const code = bookCode.toLowerCase();
  return (books[code] && books[code]["num"]) || 0;
}

module.exports = {
  getFileFormat,
  getZipContent,
  orderContent,
  getCategory,
  getBookSortOrder,
  removeProperty,
  flattenOnce,
};
