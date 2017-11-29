const red = '\x1b[31m';
const green = '\x1b[32m';
const white = '\x1b[37m';

main(process.argv.slice(2));

function main(args) {
  if (args.length < 2) {
    console.log('Must give two arguments');
    process.exit(1);
  }

  const first = require(args[0]);
  const second = require(args[1]);

  checkType(first, second);
  checkLength(first, second);
  checkLanguages(first, second);
}

function checkType(first, second) {
  if (!Array.isArray(first)) {
    console.log(red, 'The first object is not an array');
  }
  if (!Array.isArray(second)) {
    console.log(red, 'The second object is not an array');
  }
}

function checkLength(first, second) {
  if (first.length !== second.length) {
    console.log(white, 'Objects have different length');
  }
}

function checkLanguages(first, second) {
  let remainders = second.slice();

  first.forEach((langInFirst) => {
    const index = second.findIndex(x => x.code.toLowerCase() === langInFirst.code.toLowerCase());
    const langInSecond = second[index];

    if (!langInSecond) {
      console.log(red, langInFirst.code);
    } else {
      logDiff(langInFirst.code + ' name', langInFirst.name, langInSecond.name);
      logDiff(langInFirst.code + ' englishName', langInFirst.englishName, langInSecond.englishName);
      logDiff(langInFirst.code + ' direction', langInFirst.direction, langInSecond.direction);

      checkContents(langInFirst.code, langInFirst.contents, langInSecond.contents);

      remainders = remainders.slice(index, 1);
    }
  });

  remainders.forEach((langInSecond) => {
    console.log(green, langInSecond.code);
  });
}

function checkContents(langCode, firstContents, secondContents) {
  logDiff(langCode + ' contents length', firstContents.length, secondContents.length);

  let remainders = secondContents.slice();

  firstContents.forEach(contentInFirst => {
    const index = secondContents.findIndex(x => (x.code && x.code.toLowerCase()) === (contentInFirst.code && contentInFirst.code.toLowerCase()));
    const contentInSecond = secondContents[index];

    if (!contentInSecond) {
      console.log(red, contentInFirst.code);
    } else {
      logDiff(contentInFirst.code + ' name', contentInFirst.name, contentInSecond.name);
      logDiff(contentInFirst.code + ' subject', contentInFirst.subject, contentInSecond.subject);
      logDiff(contentInFirst.code + ' description', contentInFirst.description, contentInSecond.description);
      logDiff(contentInFirst.code + ' checkingLevel', contentInFirst.checkingLevel, contentInSecond.checkingLevel);    
      logDiff(contentInFirst.code + ' category', contentInFirst.category, contentInSecond.category);

      const compositeCode = langCode + ' ' + contentInFirst.code;
      checkLinks(compositeCode, contentInFirst.links, contentInSecond.links);
      checkSubcontents(compositeCode, contentInFirst.subcontents, contentInSecond.subcontents);

      remainders = remainders.slice(index, 1);
    }

    remainders.forEach((contentInSecond) => {
      console.log(green, langCode, contentInSecond.code);
    });
  });
}

function checkLinks(compositeCode, firstLinks, secondLinks) {
  if (Array.isArray(firstLinks) && !secondLinks) {
    console.log(white, compositeCode, 'links');
    console.log(white, '  first  :', red, 'Array(' + firstLinks.length + ')');
    console.log(white, '  second :', green, typeof secondLinks);
    return;
  }

  if (Array.isArray(secondLinks) && !firstLinks) {
    console.log(white, compositeCode, 'links');
    console.log(white, '  first  :', red, typeof secondLinks);
    console.log(white, '  second :', green, 'Array(' + secondLinks.length + ')');
    return;
  }

  if (!Array.isArray(firstLinks) && !Array.isArray(secondLinks)) {
    logDiff(compositeCode + ' links', typeof firstLinks, typeof secondLinks);
    return;
  }

  logDiff(compositeCode + ' links length', firstLinks.length, secondLinks.length);

  let remainders = secondLinks.slice();

  firstLinks.forEach(linkInFirst => {
    const index = secondLinks.findIndex(x => {
      // If audio/video, the quality has to match as well to be considered the same.
      if (x.quality || linkInFirst.quality) {
        return (
          (x.format.toLowerCase() === linkInFirst.format.toLowerCase()) &&
          (x.quality && x.quality.toLowerCase()) === (linkInFirst.quality && linkInFirst.quality.toLowerCase())
        );
      }
      return x.format.toLowerCase() === linkInFirst.format.toLowerCase();
    });
    const linkInSecond = secondLinks[index];

    if (!linkInSecond) {
      console.log(red, linkInFirst.code);
    } else {
      logDiff(compositeCode + ' ' + linkInFirst.format + ' url', linkInFirst.url, linkInSecond.url);
      logDiff(compositeCode + ' ' + linkInFirst.format + ' zipContent', linkInFirst.zipContent, linkInSecond.zipContent);
      logDiff(compositeCode + ' ' + linkInFirst.format + ' quality', linkInFirst.quality, linkInSecond.quality);

      remainders = remainders.slice(index, 1);
    }

    remainders.forEach((linkInSecond) => {
      console.log(green, compositeCode, linkInSecond.format);
    });
  });
}

function checkSubcontents(compositeCode, firstSubcontents, secondSubcontents) {
  if (Array.isArray(firstSubcontents) && !secondSubcontents) {
    console.log(white, compositeCode, 'links');
    console.log(white, '  first  :', red, 'Array(' + firstSubcontents.length + ')');
    console.log(white, '  second :', green, typeof secondSubcontents);
    return;
  }

  if (Array.isArray(secondSubcontents) && !firstSubcontents) {
    console.log(white, compositeCode, 'links');
    console.log(white, '  first  :', red, typeof secondSubcontents);
    console.log(white, '  second :', green, 'Array(' + secondSubcontents.length + ')');
    return;
  }

  if (!Array.isArray(firstSubcontents) && !Array.isArray(secondSubcontents)) {
    logDiff(compositeCode + ' links', typeof firstSubcontents, typeof secondSubcontents);
    return;
  }

  logDiff(compositeCode + ' subcontents length', firstSubcontents.length, secondSubcontents.length);

  let remainders = secondSubcontents.slice();

  firstSubcontents.forEach(subcontentInFirst => {
    const index = secondSubcontents.findIndex(x => (x.code && x.code.toLowerCase()) === (subcontentInFirst.code && subcontentInFirst.code.toLowerCase()));
    const subcontentInSecond = secondSubcontents[index];

    if (!subcontentInSecond) {
      console.log(red, subcontentInFirst.code);
    } else {
      logDiff(subcontentInFirst.code + ' name', subcontentInFirst.name, subcontentInSecond.name);
      logDiff(subcontentInFirst.code + ' category', subcontentInFirst.category, subcontentInSecond.category);
      logDiff(subcontentInFirst.code + ' sort', subcontentInFirst.sort, subcontentInSecond.sort);

      checkLinks(compositeCode + ' ' + subcontentInFirst.code, subcontentInFirst.links, subcontentInSecond.links);

      remainders = remainders.slice(index, 1);
    }

    remainders.forEach((subcontentInSecond) => {
      console.log(green, compositeCode, subcontentInSecond.code);
    });
  });
}

function logDiff(message, firstValue, secondValue) {
  if (firstValue !== secondValue) {
    console.log(red, message);
    console.log(white, '   first  : ', red, firstValue);
    console.log(white, '   second : ', green, secondValue);
  }
}
