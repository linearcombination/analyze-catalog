/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint no-use-before-define: ["error", { functions: false }] */

const express = require('express');
const request = require('request');
const fs = require('fs');

const {
  getFileFormat,
  getZipContent,
} = require('./helpers');
const books = require('./books.json');
const contentOrder = require('./content_order.json');

const app = express();

const apiV3Url = 'https://api.door43.org/v3/catalog.json';
let unalteredData;
let alteredData;


function alter(data) {
  const cherryPickedData = cherryPickLang(data.languages);
  return cherryPickedData;
}

function cherryPickLang(languages) {
  return languages
    .map(lang => ({
      name: lang.title,
      code: lang.identifier,
      direction: lang.direction,
      contents: orderContent(unNestSubcontent(
        ['obs', 'obs-tn', 'obs-tq', 'tw'],
        cherryPickContents(lang.resources),
      )),
    }))
    .sort((lang, nextLang) => {
      if (lang.code === nextLang.code) {
        return 0;
      }
      return lang.code > nextLang.code ? 1 : -1;
    });
}

function cherryPickContents(contents) {
  return contents.map(content => ({
    name: content.title,
    code: content.identifier,
    subject: content.subject,
    description: content.description,
    checkingLevel: content.checking.checking_level,
    links: cherryPickLinks(content.formats) || [],
    subcontents: cherryPickSubcontents(content.projects),
  }));
}

function cherryPickLinks(links) {
  return links && links.map(link => ({
    url: link.url,
    format: getFileFormat(link.url),
    zipContent: getZipContent(link.format),
  }));
}

function cherryPickSubcontents(subcontents) {
  return subcontents
    .filter(subcontent => subcontent.formats && subcontent.formats.length > 0)
    .map(subcontent => ({
      name: subcontent.title,
      code: subcontent.identifier,
      // .sort is an array function.
      // eslint-disable-next-line dot-notation
      sort: subcontent['sort'],
      category: getCategory(subcontent.identifier),
      links: cherryPickLinks(subcontent.formats),
    }));
}

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

function getCategory(bookCode) {
  const code = bookCode.toLowerCase();
  return (books[code] && `bible-${books[code].anth}`) || '';
}

/**
 *
 * ROUTES
 *
 */

app.get('/', (req, res) => {
  res.json(unalteredData);
});

app.get('/altered', (req, res) => {
  res.json(alteredData);
});

app.get('/altered/json', (req, res) => {
  const filePath = './altered_data.json';
  fs.writeFile(filePath, JSON.stringify(alteredData), (err) => {
    if (err) {
      return console.log(err);
    }
    return res.download(filePath);
  });
});

/**
 *
 * MAIN EXECUTION
 *
 */

request(apiV3Url, (err, resp, body) => {
  unalteredData = JSON.parse(body);
  alteredData = alter(unalteredData);

  app.listen(8081, () => {
    console.log('Server running at http://localhost:8081/');
  });
});
