/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint no-use-before-define: ["error", { functions: false }] */

const express = require('express');
const request = require('request');
const fs = require('fs');
const {
  orderContent,
  unNestSubcontent,
  getFileFormat,
  getZipContent,
  getCategory,
} = require('./helpers');

const app = express();

const apiV3Url = 'https://api.door43.org/v3/catalog.json';
const langDataUrl = 'https://td.unfoldingword.org/exports/langnames.json';
let unalteredData;
let alteredData;
let langData;


function alter(data) {
  const cherryPickedData = cherryPickLang(data.languages);
  return cherryPickedData;
}

function cherryPickLang(languages) {
  return languages
    .map(lang => ({
      name: lang.title,
      englishName: getEnglishName(lang.identifier),
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

function getEnglishName(langCode) {
  return langData.filter(lang => lang.lc === langCode)[0].ang || '';
}

function cherryPickContents(contents) {
  return contents.map(content => ({
    name: content.title,
    code: content.identifier,
    subject: content.subject,
    description: content.description,
    checkingLevel: content.checking.checking_level,
    links: cherryPickLinks(content.formats) || [],
    subcontents: cherryPickSubcontents(content.projects, content.identifier),
  }));
}

function cherryPickLinks(links) {
  return links && links.map(link => ({
    url: link.url,
    format: getFileFormat(link.url),
    zipContent: getZipContent(link.format),
  }));
}

function cherryPickSubcontents(subcontents, contentCode) {
  return subcontents
    .filter((subcontent) => {
      const hasFormats = subcontent.formats && subcontent.formats.length > 0;
      const notTAIntro = !(contentCode === 'ta' && subcontent.identifier === 'intro');
      const notTAProcessManual = !(contentCode === 'ta' && subcontent.identifier === 'process');
      const notTACheckingManual = !(contentCode === 'ta' && subcontent.identifier === 'checking');
      return hasFormats && notTAIntro && notTAProcessManual && notTACheckingManual;
    })
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

request(langDataUrl, (langDataError, langDataResp, langDataBody) => {
  langData = JSON.parse(langDataBody);

  request(apiV3Url, (contentError, contentResp, contentBody) => {
    unalteredData = JSON.parse(contentBody);
    alteredData = alter(unalteredData);

    app.listen(8081, () => {
      console.log('Server running at http://localhost:8081/');
    });
  });
});
