const {
  getFileFormat,
  getZipContent,
  getCategory,
  normalizeSubject,
  getBookSortOrder,
  removeProperty,
  flattenOnce,
} = require('./helpers');

function mapLanguages(languages) {
  return languages.map(lang => ({
    name: lang.title,
    code: lang.identifier,
    direction: lang.direction,
    contents: lang.resources,
  }));
}

function mapContents(languages) {
  return languages.map(l => ({
    ...l,
    contents: l.contents.map(content => ({
      name: overrideContentTitle(content.title),
      code: content.identifier,
      subject: normalizeSubject(content.subject),
      description: content.description,
      checkingLevel: content.checking.checking_level,
      links: content.formats,
      subcontents: content.projects,
    })),
  }));
}

const contentTitleOverrides = require('./data/content_title_overrides.json');
function overrideContentTitle(title) {
    if (title in contentTitleOverrides) {
        return contentTitleOverrides[title];
    } else {
        return title;
    }
}

function mapContentLinks(languages) {
  return languages.map(l => ({
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
}

function mapSubcontents(languages) {
  return languages.map(l => ({
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
}

function filterSubcontents(languages) {
  return languages.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
      ...c,
      subcontents: c.subcontents && c.subcontents.length > 0
        ? c.subcontents.filter((s) => {
          const hasLinks = s.links && s.links.length > 0;
          // Special cases: Deborah wants them not to appear
          const notTAIntro = !(c.code === 'ta' && s.code === 'intro');
          const notTAProcessManual = !(c.code === 'ta' && s.code === 'process');
          const notTACheckingManual = !(c.code === 'ta' && s.code === 'checking');
          return hasLinks && notTAIntro && notTAProcessManual && notTACheckingManual;
        })
        : [],
    })),
  }));
}

function mapSubcontentLinks(languages) {
  return languages.map(l => ({
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
              // OBS subcontent has, oddly, chapters inside each links.
              chapters: link.chapters || [],
            }))
            : [],
        }))
        : [],
    })),
  }));
}

function addEnglishNames(langNameData, languages) {
  return languages.map((l) => {
    const data = langNameData.find(lang => lang.lc === l.code);
    return {
      ...l,
      englishName: (data && data.ang) || '',
    };
  });
}

function sortLanguageByNameOrEnglishName(languages) {
  return languages.sort((first, second) => {
    const nameOfFirst = first.englishName || first.name;
    const nameOfSecond = second.englishName || second.name;

    if (nameOfFirst === nameOfSecond) {
      return 0;
    }

    return nameOfFirst < nameOfSecond ? -1 : 1;
  });
}

function sortContents(contentOrder, languages) {
  return languages.map(l => ({
    ...l,
    contents: l.contents.sort((first, second) => {
      const orderOfFirst = contentOrder[first.code] || 100;
      const orderOfSecond = contentOrder[second.code] || 100;

      if (orderOfFirst === orderOfSecond) {
        return 0;
      }

      return orderOfFirst < orderOfSecond ? -1 : 1;
    }),
  }));
}

function sortSubContents(languages) {
  return languages.map(l => ({
    ...l,
    contents: l.contents.map(c => ({
        ...c,
        subcontents: (c.subcontents || []).sort((first, second) => {
            // If sort field is provided use that
            const sortOrderOfFirst = first.sort;
            const sortOrderOfSecond = second.sort;
            if (sortOrderOfFirst !== sortOrderOfSecond) {
                return sortOrderOfFirst < sortOrderOfSecond ? -1 : 1;
            }
            // Else lookup book sort order
            const bookSortOrderOfFirst = getBookSortOrder(first.code);
            const bookSortOrderOfSecond = getBookSortOrder(second.code);
            if (bookSortOrderOfFirst === bookSortOrderOfSecond) {
                return 0;
            }
            return bookSortOrderOfFirst < bookSortOrderOfSecond ? -1 : 1;
        })
    })),
  }));
}

function unnestSubcontents(languages) {
  const subcontentsToPromote = ['obs', 'obs-tn', 'obs-tq', 'tw'];

  return languages.map(l => ({
    ...l,
    contents: l.contents.map(c => {
      if (!subcontentsToPromote.includes(c.code) || !c.subcontents || c.subcontents.length <= 0) {
        return c;
      }

      const chosenSubcontent = c.subcontents[0];
      return {
        ...c,
        name: c.name || chosenSubcontent.name,
        links: (c.links || [])
          .concat(chosenSubcontent.links)
          .map(l => removeProperty(l, 'chapters')),
        subcontents: c.code !== 'obs'
          ? c.subcontents.slice(1)
          : turnChaptersToSubcontents(c.subcontents),
      };
    }),
  }));
}

function turnChaptersToSubcontents(obsProjects) {
  const mergedChapters = obsProjects.map(p => {
    // Just pick the chapters and quality from the links, if there are any
    const links = p.links.map(l => ({
      chapters: l.chapters || [],
      quality: l.quality || null,
    }));

    // Inject quality into each element of the chapters
    const chapters = links.map(l => ({
      chapters: l.chapters.map(c => ({
        ...c,
        quality: l.quality,
      })),
    }));

    // Put all chapter objects into one array
    const chapterArrays = chapters.reduce((array, c) => array.concat(c.chapters), []);

    // Merge chapters that have the same code/identifier
    const dedupedChapters = chapterArrays.reduce((array, c) => {
      // Map chapter into BIEL-recognized form
      const currentChapter = {
        name: c.identifier,
        category: 'obs',
        links: [{
          url: c.url,
          format: c.format.split('/').reverse()[0],
          quality: c.quality,
        }],
      };

      // Check for existing chapter with the same name
      const existingChapterIndex = array.findIndex(item => item.name === currentChapter.name);

      if (existingChapterIndex === -1) {
        array.push(currentChapter);
      } else {
        const existingChapter = array[existingChapterIndex];
        array[existingChapterIndex] = {
          ...existingChapter,
          links: existingChapter.links.concat(currentChapter.links),
        };
      }

      return array;
    }, []);

    const sortedChapters = dedupedChapters.sort((first, second) => {
      if (first.name === second.name) {
        return 0;
      }
      return first.name < second.name ? -1 : 1;
    });

    return sortedChapters;
  });

  return flattenOnce(mergedChapters);
}


module.exports = {
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
};
