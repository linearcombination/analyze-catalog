/* eslint no-console: ["error", { allow: ["log"] }] */

const express = require('express');
const request = require('request');
const fs = require('fs');

const _ = require('lodash');
const {
  getFileExtension,
  pickShorterSlug,
  concatReduceToMap,
} = require('./helpers');

const app = express();

const oldCatUrl = 'https://api.unfoldingword.org/uw/txt/2/catalog.json';
const newCatUrl = 'https://api.door43.org/v3/catalog.json';
let langnamesUrl;
let oldCatData;
let newCatData;
let langMap;
let processedOldCatData;
let processedNewCatData;
let processedBothCatData;

const processNewCat = d => (
  // Only process the languges attribute, ignore the catalogs
  d.languages
    // Order by ascending language code
    .sort((l1, l2) => (l1.identifier > l2.identifier ? 1 : -1))
    // Cherry-pick the attributes that we care about
    .map(lang => ({
      code: lang.identifier,
      direction: lang.direction,
      resources: lang.resources.map(resource => ({
        name: resource.title,
        desc: resource.description,
        subj: resource.subject,
        slug: resource.identifier,
        links: resource.formats && resource.formats.map(format => ({
          format: getFileExtension(format.url),
          url: format.url,
        })),
        contents: resource.projects && resource.projects.map(proj => ({
          title: proj.title,
          slug: proj.identifier,
          links: proj.formats && proj.formats.map(format => ({
            format: getFileExtension(format.url),
            url: format.url,
          })),
        })),
      })),
    }))
);

const processOldCat = (d) => {
  const bible = d.cat[0].langs.slice();
  const obs = d.cat[1].langs.slice();

  return bible
    // Combine the two lists
    .concat(obs)
    // Cherry-pick the attributes that we care about
    .map(lang => ({
      code: lang.lc,
      resources: lang.vers.map(ver => ({
        name: ver.name,
        slug: ver.slug,
        contents: ver.toc.map(content => ({
          title: content.title || ver.name,
          desc: content.desc,
          slug: content.slug || ver.slug,
          // Instead of having { pdf: '', src: '' }, we want the links this way
          // {
          //   links: [
          //     { format: 'pdf', url: '' },
          //     { format: 'usfm', url: '' }
          //   ]
          // }
          // TODO: Possible to do this by .filter() that doesn't return a falsy
          links: _.compact(Object.keys(content).map(key => (
            key === 'pdf' || key === 'src'
            ? {
              format: getFileExtension(content[key]),
              url: content[key],
            }
            : undefined
          ))),
        })),
      })),
    }))
    // Combine resources if two languages have the same language code
    // TODO: Optimize by using object/map/dict instead of findIndex()
    .reduce((l, lang) => {
      const newList = l.slice();
      const i = _.findIndex(newList, { code: lang.code });

      if (i === -1) {
        newList.push(lang);
      } else {
        newList[i].resources = newList[i].resources.concat(lang.resources);
      }

      return newList;
    }, []);
};

const processLangnames = d => (
  d.reduce((m, lang) => {
    const map = m;
    map[lang.lc] = {
      name: lang.ln,
      englishName: lang.ang,
      direction: lang.ld,
    };
    return map;
  }, {})
);

const combineContents = (c1, c2) => (
  concatReduceToMap(c1, c2, (map, content) => {
    map[content.title] = map[content.title]
      ? {
        desc: map[content.title].desc || content.desc,
        slug: pickShorterSlug(map[content.title].slug, content.slug),
        links: filterBadLinks(map[content.title].links
          ? map[content.title].links.concat(content.links)
          : content.links
        ),
      }
      : content;
    return map;
  })
  .mapToList('title')
);

const combineResources = (r1, r2) => {
  const mergedResourcesMap = concatReduceToMap(r1, r2, (map, resource) => {
    const name = resource.name;

    map[name] = map[name]
      ? {
        desc: map[name].desc || resource.desc,
        subj: map[name].subj || resource.subj,
        slug: pickShorterSlug(map[name].slug, resource.slug),
        links: filterBadLinks(map[name].links
          ? _.compact(map[name].links.concat(resource.links))
          : resource.links
        ),
        contents: combineContents(map[name].contents, resource.contents),
      }
      : resource;

    return map;
  });

  /*
  *
  * If content title is the same as the resource title, relocate the links one
  * level up to be at the resource. The main targets are OBS resources, which,
  * at this point, has unnecessary nesting like such:
  *
  *   resources: [
  *     {
  *       title: "Open Bible Stories",
  *       contents: [
  *         {
  *           title: "Open Bible Stories",
  *           links: [ ... ]
  *         }
  *       ]
  *     }
  *   ]
  *
  * What we want is:
  *
  *   resources: [
  *     {
  *       title: "Open Bible Stories",
  *       links: [ ... ]
  *     }
  *   ]
  *
  */
  Object.keys(mergedResourcesMap).forEach((key) => {
    mergedResourcesMap[key].contents = mergedResourcesMap[key].contents
      .filter((content) => {
        if (content.title === key) {
          mergedResourcesMap[key].links =
            (mergedResourcesMap[key].links || []).concat(content.links);
          return false;
        }
        return true;
      });
  });

  return mergedResourcesMap.mapToList('name');
};

const combineBothCats = (cat1, cat2) => (
  concatReduceToMap(cat1, cat2, (m, lang) => {
    const map = m;
    const code = lang.code;

    map[code] = !map[code]
    ? lang
    : {
      direction: map[code].direction || lang.direction,
      resources: combineResources(map[code].resources, lang.resources),
    };

    return map;
  })
  .mapToList('code')
);

const getLangInfo = (data, map) => (
  data.map((l) => {
    const lang = l;
    lang.name = map[lang.code].name;
    lang.englishName = map[lang.code].englishName;
    return lang;
  })
);

const filterBadLinks = (links) => {
  return links;
}

/**
 *
 * ROUTES
 *
 */

app.get('/old', (req, res) => {
  res.json(oldCatData);
});

app.get('/old/res', (req, res) => {
  res.json(processedOldCatData);
});

app.get('/new', (req, res) => {
  res.json(newCatData);
});

app.get('/new/res', (req, res) => {
  res.json(processedNewCatData);
});

app.get('/both/res', (req, res) => {
  res.json(processedBothCatData);
});

app.get('/both/res/json', (req, res) => {
  fs.writeFile('./data.json', JSON.stringify(processedBothCatData), (err) => {
    if (err) {
      return console.log(err);
    }
    return res.download('./data.json');
  });
});

// app.get('/both/res/links', (req, res) => {
//   processedBothCatData.
// });

/**
 *
 * MAIN EXECUTION
 *
 */

request(oldCatUrl, (err1, resp1, body1) => {
  oldCatData = JSON.parse(body1);
  processedOldCatData = processOldCat(oldCatData);

  request(newCatUrl, (err2, resp2, body2) => {
    newCatData = JSON.parse(body2);
    processedNewCatData = processNewCat(newCatData);
    langnamesUrl = newCatData.catalogs.find(c => c.identifier === 'langnames').url;

    request(langnamesUrl, (err3, resp3, body3) => {
      langMap = processLangnames(JSON.parse(body3));
      processedBothCatData = getLangInfo(
        combineBothCats(processedOldCatData, processedNewCatData),
        langMap,
      );
      app.listen(8081, () => {
        console.log('Server running at http://localhost:8081/');
      });
    });
  });
});
