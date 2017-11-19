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

const manualData = require('./data/manual.json');
const gogsData = require('./data/gogs.json');
const handmadeData = require('./data/handmade.json');

const app = express();

let catalogData;
let massagedData;
let langData;

/**
 *
 * DATA PROCESSING
 *
 */

function massage(data) {
  // const cherryPickedData = cherryPickLang(data.languages);
  const mappedLanguages = data.languages.map(lang => ({
    name: lang.title,
    code: lang.identifier,
    direction: lang.direction,
    contents: lang.resources,
  }));

  const mappedContents = mappedLanguages.map(l => ({
    ...l,
    contents: l.contents.map(content => ({
      name: content.title,
      code: content.identifier,
      subject: content.subject,
      description: content.description,
      checkingLevel: content.checking.checking_level,
      links: content.formats,
      subcontents: content.projects,
    })),
  }));

  const mappedContentLinks = mappedContents.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
      ...c,
      links: c.links && c.links.length > 0
        ? c.links.map(link => ({
          url: link.url,
          format: getFileFormat(link.url),
          zipContent: getZipContent(link.format),
          quality: link.quality || null,
        }))
        : [],
    })),
  }));

  const mappedSubcontents = mappedContentLinks.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
      ...c,
      subcontents: c.subcontents && c.subcontents.length > 0
        ? c.subcontents.map(s => ({
          name: s.title,
          code: s.identifier,
          // Use bracket notation because .sort is an array function.
          // eslint-disable-next-line dot-notation
          sort: s['sort'],
          category: getCategory(s.identifier),
          links: s.formats,
        }))
        : [],
    })),
  }));

  const filteredSubcontents = mappedSubcontents.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
      ...c,
      subcontents: c.subcontents && c.subcontents.length > 0
        ? c.subcontents.filter((s) => {
          const hasLinks = s.links && s.links.length > 0;
          // Special cases
          const notTAIntro = !(c.code === 'ta' && s.code === 'intro');
          const notTAProcessManual = !(c.code === 'ta' && s.code === 'process');
          const notTACheckingManual = !(c.code === 'ta' && s.code === 'checking');
          return hasLinks && notTAIntro && notTAProcessManual && notTACheckingManual;
        })
        : [],
    })),
  }));

  const mappedSubcontentLinks = filteredSubcontents.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
      ...c,
      subcontents: c.subcontents && c.subcontents.length > 0
        ? c.subcontents.map(s => ({
          ...s,
          links: s.links && s.links.length > 0
            ? s.links.map(link => ({
              url: link.url,
              format: getFileFormat(link.url),
              zipContent: getZipContent(link.format),
              quality: link.quality || null,
              chapters: link.chapters || [],
            }))
            : [],
        }))
        : [],
    })),
  }));

  const combinedData = addAdditionalData(mappedSubcontentLinks);

  const withEnglishName = combinedData.map(l => ({
    ...l,
    englishName: getEnglishName(l.code),
  }));

  const sortedByNameOrEnglishName = withEnglishName.sort(byNameOrEnglishName);

  const processedContentData = sortedByNameOrEnglishName.map(d => ({
    ...d,
    contents: unNestSubcontent(
      ['obs', 'obs-tn', 'obs-tq', 'tw'],
      orderContent(d.contents),
    ),
  }));
  return processedContentData;
}

function byNameOrEnglishName(first, second) {
  const nameOfFirst = first.englishName || first.name;
  const nameOfSecond = second.englishName || second.name;

  if (nameOfFirst === nameOfSecond) {
    return 0;
  }
  return nameOfFirst < nameOfSecond ? -1 : 1;
}

function addAdditionalData(data) {
  const dataToAdd = manualData
    .concat(gogsData)
    .concat(handmadeData)
    .map(language => ({
      name: getName(language.code),
      // englishName: getEnglishName(language.code),
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

function unNestSubcontent(contentCodes, contents) {
  return contentCodes.reduce((acc, code) => {
    const targetContents = acc.filter(content => content.code === code);
    const restOfContents = acc.filter(content => content.code !== code);

    return targetContents
      .map((content) => {
        if (!content.subcontents || content.subcontents.length < 1) {
          return content;
        }
        return Object.assign({}, content, {
          name: content.subcontents[0].name,
          links: content.subcontents[0].links.map(l => removeProperty(l, 'chapters')),
          subcontents: code === 'obs'
            ? processOBSSubcontent(content.subcontents)
            : content.subcontents.slice(1),
        });
      })
      .concat(restOfContents);
  }, contents.slice());
}

function processOBSSubcontent(subcontents) {
  return flattenOnce(subcontents.map(subcontent => compileChapters(subcontent.links)))
    .reduce((compiledChapters, chapter) => mergeSameChapters(compiledChapters, chapter), [])
    .sort((chapter, nextChapter) => sortByChapter(chapter, nextChapter));
}

function compileChapters(links) {
  return links.reduce((allChapters, link) => {
    const chapters = link.chapters || [];
    return allChapters.concat(chapters.map(chapter => (
      // Add the info we need from the parent
      Object.assign({}, chapter, { quality: link.quality })
    )));
  }, []);
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