/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint no-use-before-define: ["error", { functions: false }] */

const express = require('express');
const request = require('request');
const fs = require('fs');

const {
  mapLanguages,
  mapContents,
  mapContentLinks,
  mapSubcontents,
  filterSubcontents,
  mapSubcontentLinks,
  addEnglishNames,
  sortLanguageByNameOrEnglishName,
  sortContents,
  sortSubContents,
  unnestSubcontents,
} = require('./functions');

const {
  flattenOnce,
} = require('./helpers');

const manualData = require('./data/manual.json');
const gogsData = require('./data/gogs.json');
const handmadeData = require('./data/handmade.json');
const contentOrderData = require('./data/content_order.json');

const app = express();

let langData;
let catalogData;
let massagedData;

/**
 *
 * DATA PROCESSING
 *
 */

function massage(data) {
  let result = mapLanguages(data.languages);
  result = mapContents(result);
  result = mapContentLinks(result);
  result = mapSubcontents(result);
  result = filterSubcontents(result);
  result = mapSubcontentLinks(result);
  result = addAdditionalData(result);
  result = addEnglishNames(langData, result);
  result = sortLanguageByNameOrEnglishName(result);
  result = sortContents(contentOrderData, result);
  result = sortSubContents(result);
  result = unnestSubcontents(result);

  return result;
}

/**
 * Add only what's needed. Possible addition:
 *   1. Everything for a language
 *   2. New language contents (resources)
 *   3. New content subcontents (books)
 *   4. New subcontent links (format and/or URL)
 */
// TODO: Find a better way to merge additional data
function addAdditionalData(data) {
  const dataToAdd = manualData
    .concat(gogsData)
    .concat(handmadeData)
    .map(l => ({
      name: langData.filter(lang => lang.lc === l.code)[0].ln || 'Unknown',
      code: l.code,
      direction: langData.filter(lang => lang.lc === l.code)[0].ld || 'ltr',
      contents: l.contents.slice(),
    }));

  const combinedData = data.slice();

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

/**
 *
 * ROUTES
 *
 */

app.get('/', (req, res) => {
  res.json(catalogData);
});

app.get('/massaged', (req, res) => {
  res.json(massagedData);
});

app.get('/massaged/json', (req, res) => {
  const filePath = './massaged_data.json';
  fs.writeFile(filePath, JSON.stringify(massagedData), (err) => {
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

main();

function main() {
  request('https://td.unfoldingword.org/exports/langnames.json', (err1, resp1, body1) => {
    langData = JSON.parse(body1);
    request('https://api.door43.org/v3/catalog.json', (err2, resp2, body2) => {
      catalogData = JSON.parse(body2);
      massagedData = massage(catalogData);
      app.listen(8081, () => {
        console.log('Server running at http://localhost:8081/');
      });
    });
  });
}
