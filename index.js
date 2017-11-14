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
const gogsContents = require('./gogs.json');

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
  const sortedLanguageData = augmentedData.sort(byNameOrEnglishName);
  const sortedContentData = sortedLanguageData.map(d => ({
    ...d,
    contents: orderContent(d.contents),
  }));
  return sortedContentData;
}

function byNameOrEnglishName(first, second) {
  const nameOfFirst = first.englishName || first.name;
  const nameOfSecond = second.englishName || second.name;

  if (nameOfFirst === nameOfSecond) {
    return 0;
  }
  return nameOfFirst < nameOfSecond ? -1 : 1;
}

function cherryPickLang(languages) {
  return languages
    .map(lang => ({
      name: lang.title,
      englishName: getEnglishName(lang.identifier),
      code: lang.identifier,
      direction: lang.direction,
      contents: unNestSubcontent(
        ['obs', 'obs-tn', 'obs-tq', 'tw'],
        cherryPickContents(lang.resources),
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
  const dataToAdd = additionalContents
    .concat(gogsContents)
    .map(language => ({
      name: getName(language.code),
      englishName: getEnglishName(language.code),
      code: language.code,
      direction: getDirection(language.code),
      contents: language.contents.slice(),
    }));

  const combinedData = data.slice();

  /**
   * Add only what's needed. Possible addition:
   *   1. Everything for a language
   *   2. New language contents (resources)
   *   3. New content subcontents (books)
   *   4. New subcontent links (format and/or URL)
   */
  // TODO: Find a better way to merge additional data
  for (let i = 0; i < dataToAdd.length; i += 1) {
    const lang = dataToAdd[i];
    const existingLangIndex = combinedData.findIndex(l => l.code === lang.code);

    if (existingLangIndex === -1) {
      console.log('Merge the whole language', lang.code);
      combinedData.push(lang);
      continue;
    }

    if (!lang.contents) {
      continue;
    }

    const existingLang = combinedData[existingLangIndex];

    for (let j = 0; j < lang.contents.length; j += 1) {
      const content = lang.contents[j];
      const existingContentIndex =
        existingLang.contents.findIndex(c => c.code === content.code);

      if (existingContentIndex === -1) {
        console.log('Merge only the contents for', lang.code, content.code);
        combinedData[existingLangIndex].contents.push(content);
        continue;
      }

      const existingContent = existingLang.contents[existingContentIndex];

      if (Array.isArray(content.links)) {
        for (let l = 0; l < content.links.length; l += 1) {
          const link = content.links[l];
          const existingLinkIndex =
            existingContent.links.findIndex(x => x.format === link.format);
          
          if (existingLinkIndex === -1) {
            console.log('Merge only the content link', lang.code, content.code, link.format);
            combinedData[existingLangIndex]
              .contents[existingContentIndex]
              .links.push(link);
          }
        }
      }

      if (!content.subcontents) {
        continue;
      }

      for (let k = 0; k < content.subcontents.length; k += 1) {
        const subcontent = content.subcontents[k];
        const existingSubcontentIndex =
          existingContent.subcontents.findIndex(s => s.code === subcontent.code);

        if (existingSubcontentIndex === -1) {
          console.log('Merge only the subcontents for', lang.code, content.code, subcontent.code);
          combinedData[existingLangIndex]
            .contents[existingContentIndex]
            .subcontents.push(subcontent);
          continue;
        }

        if (!subcontent.links) {
          continue;
        }

        const existingSubcontent = existingContent.subcontents[existingSubcontentIndex];

        for (let l = 0; l < subcontent.links.length; l += 1) {
          const link = subcontent.links[l];
          const existingLinkIndex = existingSubcontent.links
            .findIndex(x => x.format === link.format);

          if (existingLinkIndex === -1) {
            console.log('Merge only the links for', lang.code, content.code, subcontent.code);
            combinedData[existingLangIndex]
              .contents[existingContentIndex]
              .subcontents[existingSubcontentIndex]
              .links.push(link);
            continue;
          }

          // At this point, the additional content has the same language, content, subcontent, link
          // format, and link URL. There's no need to add it to the list.
          console.log(
            'No need to merge',
            lang.code,
            content.code,
            subcontent.code,
            link.format,
            link.url,
          );
        }
      }
    }
  }

  return combinedData;
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
