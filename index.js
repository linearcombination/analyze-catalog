/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint no-use-before-define: ["error", { functions: false }] */

const express = require('express');
const request = require('request');
const fs = require('fs');
const {
  orderContent,
  getFileFormat,
  getZipContent,
  getCategory,
  removeProperty,
  flattenOnce,
} = require('./helpers');
const additionalContents = require('./additional_contents.json');

const app = express();

const apiV3Url = 'https://api.door43.org/v3/catalog.json';
const langDataUrl = 'https://td.unfoldingword.org/exports/langnames.json';
let unalteredData;
let alteredData;
let langData;

/**
 *
 * DATA PROCESSING
 *
 */

function alter(data) {
  const cherryPickedData = cherryPickLang(data.languages);
  const augmentedData = addAdditionalLanguage(cherryPickedData);
  return augmentedData;
}

function cherryPickLang(languages) {
  return languages
    .map(lang => ({
      name: lang.title,
      englishName: getEnglishName(lang.identifier),
      code: lang.identifier,
      direction: lang.direction,
      contents: orderContent(
        addAdditionalContent(
          lang.identifier,
          unNestSubcontent(
            ['obs', 'obs-tn', 'obs-tq', 'tw'],
            cherryPickContents(lang.resources),
          ),
        ),
      ),
    }))
    .sort((lang, nextLang) => {
      if (lang.code === nextLang.code) {
        return 0;
      }
      return lang.code > nextLang.code ? 1 : -1;
    });
}

function addAdditionalLanguage(data) {
  const additionalContentsToAdd = additionalContents.filter(language => (
    data.filter(l => l.code === language.code).length === 0
  ));

  const languagesToAdd = additionalContentsToAdd.map(language => ({
    name: getName(language.code),
    englishName: getEnglishName(language.code),
    code: language.code,
    direction: getDirection(language.code),
    contents: language.contents.slice(),
  }));

  return data.concat(languagesToAdd);
}

function getName(langCode) {
  return langData.filter(lang => lang.lc === langCode)[0].ln || 'Unknown';
}

function getDirection(langCode) {
  return langData.filter(lang => lang.lc === langCode)[0].ld || 'ltr';
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
    links: (cherryPickLinks(content.formats) || []).map(l => removeProperty(l, 'chapters')),
    subcontents: cherryPickSubcontents(content.projects, content.identifier),
  }));
}

function cherryPickLinks(links) {
  if (!links || links.length <= 0) {
    return [];
  }

  return links.map(link => ({
    url: link.url,
    format: getFileFormat(link.url),
    zipContent: getZipContent(link.format),
    quality: link.quality || null,
    chapters: link.chapters || [],
  }));
}

function cherryPickSubcontents(subcontents, contentCode) {
  return subcontents
    .filter((subcontent) => {
      const hasFormats = subcontent.formats && subcontent.formats.length > 0;
      // Special cases
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

function addAdditionalContent(langCode, contents) {
  const results = additionalContents.filter(language => language.code === langCode);
  if (results.length === 0) {
    return contents;
  }

  const contentsToAdd = flattenOnce(results.map(result => result.contents));
  return contents.concat(contentsToAdd);
}

function unNestSubcontent(contentCodes, contents) {
  return contentCodes.reduce((acc, code) => {
    const targetContents = acc.filter(content => content.code === code);
    const restOfContents = acc.filter(content => content.code !== code);

    return targetContents
      .map(content => Object.assign({}, content, {
        name: content.subcontents[0].name,
        links: code === 'obs'
          ? content.subcontents[0].links.map(l => removeProperty(l, 'chapters'))
          : content.subcontents[0].links.slice(),
        subcontents: code === 'obs'
          ? processOBSSubcontent(content.subcontents)
          : content.subcontents.slice(1),
      }))
      .concat(restOfContents);
  }, contents.slice());
}

function processOBSSubcontent(subcontents) {
  return flattenOnce(subcontents.map(subcontent => compileChapters(subcontent.links)))
    .reduce((compiledChapters, chapter) => mergeSameChapters(compiledChapters, chapter), [])
    .sort((chapter, nextChapter) => sortByChapter(chapter, nextChapter));
}

function compileChapters(links) {
  return links.reduce((allChapters, link) => (
    allChapters.concat(link.chapters.map(chapter => (
      // Add the info we need from the parent
      Object.assign({}, chapter, { quality: link.quality })
    )))
  ), []);
}

function sortByChapter(item, nextItem) {
  if (item.name === nextItem.name) {
    return 0;
  }

  return item.name > nextItem.name ? 1 : -1;
}

function mergeSameChapters(compiledChapters, chapter) {
  let isCombined = false;
  const currentChapter = {
    name: chapter.identifier,
    category: 'obs',
    links: [{
      url: chapter.url,
      // TODO: Possibly abstract this out
      format: chapter.format.split('/').reverse()[0],
      quality: chapter.quality,
    }],
  };

  const mergedChapters = compiledChapters.map((existingChapter) => {
    if (existingChapter.name === currentChapter.name) {
      isCombined = true;
      return {
        name: existingChapter.name,
        category: 'obs',
        links: [].concat(existingChapter.links, currentChapter.links),
      };
    }
    return existingChapter;
  });

  if (!isCombined) {
    mergedChapters.push(currentChapter);
  }

  return mergedChapters;
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
