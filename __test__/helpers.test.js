const helpers = require('../helpers');


describe('getFileFormat', () => {
  const getFileFormat = helpers.getFileFormat;

  it('returns the string after the last dot', () => {
    expect(getFileFormat('.com')).toBe('com');
    expect(getFileFormat('file_name.txt')).toBe('txt');
    expect(getFileFormat('path/to/file.json')).toBe('json');
    expect(getFileFormat('spec.test.js')).toBe('js');
  });
});


describe('getZipContent', () => {
  const getZipContent = helpers.getZipContent;

  it('returns the zip content from a format string', () => {
    expect(getZipContent('application/zip; content=application/json')).toBe('json');
    expect(getZipContent('application/zip; content=text/usfm; key=value')).toBe('usfm');
  });

  it('returns an empty string if format string doesn\'t contain "application/zip"', () => {
    expect(getZipContent('application/json')).toBe('');
    expect(getZipContent('any random string')).toBe('');
  });
});


describe('flattenOnce', () => {
  const flattenOnce = helpers.flattenOnce;

  it('flattens a nested array one-level deep', () => {
    const input = [
      [1, [2, 2], [3, 3, 3]],
      [4, 5, [1, [2, 2]]],
    ];
    const output = [
      1,
      [2, 2],
      [3, 3, 3],
      4,
      5,
      [1, [2, 2]],
    ];
    expect(flattenOnce(input)).toEqual(output);
  });

  it('works with array of objects', () => {
    const input = [
      [{ value: 1 }, { value: 2 }],
      [{ value: 1 }, { value: 3 }],
    ];
    const output = [
      { value: 1 },
      { value: 2 },
      { value: 1 },
      { value: 3 },
    ];
    expect(flattenOnce(input)).toEqual(output);
  });
});

describe('removeProperty', () => {
  const removeProperty = helpers.removeProperty;

  it('returns a copy of the object with specified property removed', () => {
    const input = {
      test: 0,
      tests: 1,
    };
    const output = {
      tests: 1,
    };
    expect(removeProperty(input, 'test')).toEqual(output);
    expect(input).toEqual(input);
  });
});

describe('orderContent', () => {
  const orderContent = helpers.orderContent;

  it('orders content based on pre-determined order', () => {
    const input = [
      { code: 'tq' },
      { code: 'reg' },
      { code: 'tn' },
      { code: 'ulb' },
    ];
    const output = [
      { code: 'reg' },
      { code: 'ulb' },
      { code: 'tn' },
      { code: 'tq' },
    ];
    expect(orderContent(input)).toEqual(output);
  });
});

describe('getCategory', () => {
  const getCategory = helpers.getCategory;

  it('returns the door43 category of a book/project', () => {
    expect(getCategory('gen')).toBe('bible-ot');
    expect(getCategory('mrk')).toBe('bible-nt');
  });

  it('returns an empty string if book code is not recognized', () => {
    expect(getCategory('obs')).toBe('');
    expect(getCategory('tn')).toBe('');
  });
});