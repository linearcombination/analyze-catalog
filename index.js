/* eslint no-console: ["error", { allow: ["log"] }] */

const express = require('express');
const request = require('request');
const fs = require('fs');

const _ = require('lodash');
const {
  getFileExtension,
  pickShorterSlug,
  concatReduceToMap,
  revertMapToList,
} = require('./helpers');

const app = express();

const oldCatUrl = 'https://api.unfoldingword.org/uw/txt/2/catalog.json';
const newCatUrl = 'https://api.door43.org/v3/catalog.json';
let OLD_CAT;
let NEW_CAT;
let PROCESSED_OLD_CAT;
let PROCESSED_NEW_CAT;
let PROCESSED_DATA;

const getLinksFromContent = content => (
  _.compact(
    Object.keys(content)
      .map(key => (
        key === 'pdf' || key === 'src'
        ? {
          format: getFileExtension(content[key]),
          url: content[key],
        }
        : undefined
      )),
  )
);

const processNewCat = d => (
  d.languages
    .sort((lang1, lang2) => lang1.identifier > lang2.identifier ? 1 : -1)
    .map(lang => ({
      code: lang.identifier,
      direction: lang.direction,
      resources: lang.resources.map(resource => ({
        name: resource.title,
        desc: resource.description,
        subj: resource.subject,
        slug: resource.identifier,
        links: resource.formats && resource.formats.map(format => ({
          format: format.format,
          url: format.url,
        })),
        content: resource.projects && resource.projects.map(proj => ({
          title: proj.title,
          slug: proj.identifier,
          links: proj.formats && proj.formats.map(format => ({
            format: format.format,
            url: format.url,
          })),
        })),
      })),
    }))
);

const processOldCat = d => (
  _.union(d.cat[0].langs, d.cat[1].langs)
    .map(lang => ({
      code: lang.lc,
      resources: lang.vers.map(ver => ({
        name: ver.name,
        slug: ver.slug,
        content: ver.toc.map(content => ({
          title: content.title || ver.name,
          desc: content.desc,
          slug: content.slug || ver.slug,
          links: getLinksFromContent(content),
        })),
      })),
    }))
    .reduce((l, lang) => {
      const list = l.slice();
      const i = _.findIndex(list, { code: lang.code });
      if (i === -1) {
        list.push(lang);
      } else {
        list[i].resources = list[i].resources.concat(lang.resources);
      }
      return list;
    }, [])
);

const combineContents = (contents1, contents2) => {
  const combinedContentsMap = concatReduceToMap(
    contents1,
    contents2,
    (map, content) => {
      map[content.title] = map[content.title]
        ? {
          desc: map[content.title].desc || content.desc,
          slug: pickShorterSlug(map[content.title].slug, content.slug),
          links: map[content.title].links
            ? map[content.title].links.concat(content.links)
            : content.links,
        }
        : content;
      return map;
    },
  );

  return revertMapToList(
    combinedContentsMap,
    (map, title) => Object.assign({ title }, map[title]),
  );
};

const combineResources = (resources1, resources2) => {
  const combinedResourcesMap = concatReduceToMap(
    resources1,
    resources2,
    (map, res) => {
      map[res.name] = map[res.name]
        ? {
          desc: map[res.name].desc || res.desc,
          subj: map[res.name].subj || res.subj,
          slug: pickShorterSlug(map[res.name].slug, res.slug),
          content: combineContents(map[res.name].content, res.content),
        }
        : res;
      return map;
    },
  );

  return revertMapToList(
    combinedResourcesMap,
    (map, name) => Object.assign({ name }, map[name]),
  );
};

const combineBothCats = (cat1, cat2) => {
  const combinedLanguagesMap = concatReduceToMap(cat1, cat2, (map, lang) => {
    map[lang.code] = map[lang.code]
      ? {
        direction: map[lang.code].direction || lang.direction,
        resources: combineResources(map[lang.code].resources, lang.resources),
      }
      : lang;
    return map;
  });

  return revertMapToList(
    combinedLanguagesMap,
    (map, code) => Object.assign({ code }, combinedLanguagesMap[code]),
  );
};

app.get('/old', (req, res) => {
  res.json(OLD_CAT);
});

app.get('/old/res', (req, res) => {
  res.json(PROCESSED_OLD_CAT);
});

app.get('/new', (req, res) => {
  res.json(NEW_CAT);
});

app.get('/new/res', (req, res) => {
  res.json(PROCESSED_NEW_CAT);
});

app.get('/both/res', (req, res) => {
  res.json(PROCESSED_DATA);
});

app.get('/both/res/json', (req, res) => {
  const data = combineBothCats(PROCESSED_OLD_CAT, PROCESSED_NEW_CAT);
  fs.writeFile('./data.json', JSON.stringify(data, null, 2), (err) => {
    if (err) {
      return console.log(err);
    }
    res.download('./data.json');
  });
});

request(oldCatUrl, (err1, resp1, body1) => {
  OLD_CAT = JSON.parse(body1);
  PROCESSED_OLD_CAT = processOldCat(OLD_CAT);
  request(newCatUrl, (err2, resp2, body2) => {
    NEW_CAT = JSON.parse(body2);
    PROCESSED_NEW_CAT = processNewCat(NEW_CAT);
    PROCESSED_DATA = combineBothCats(PROCESSED_OLD_CAT, PROCESSED_NEW_CAT);
    app.listen(8081, () => {
      console.log('Server running at http://localhost:8081/');
    });
  });
});
