const functions = require('../functions');


describe('mapLanguages', () => {
  const mapLanguages = functions.mapLanguages;

  it('maps needed language properties to a different name', () => {
    const input = [
      {
        title: 'Test Language',
        identifier: 'xx',
        direction: 'ltr',
        resources: [],
        unneededProperty: true,
      },
    ];
    const output = [
      {
        name: 'Test Language',
        code: 'xx',
        direction: 'ltr',
        contents: [],
      },
    ];
    expect(mapLanguages(input)).toEqual(output);
  });
});


describe('mapContents', () => {
  const mapContents = functions.mapContents;

  it('maps needed content/resource properties to a different name', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          {
            title: 'Some Resource',
            identifier: 'sr',
            subject: 'Bible',
            description: 'Resource to test mapContents',
            checking: { checking_level: 0 },
            formats: [1, 2, 3],
            projects: [4, 5, 6],
            unneededProperty: true,
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          {
            name: 'Some Resource',
            code: 'sr',
            subject: 'Bible',
            description: 'Resource to test mapContents',
            checkingLevel: 0,
            links: [1, 2, 3],
            subcontents: [4, 5, 6],
          },
        ],
      },
    ];
    expect(mapContents(input)).toEqual(output);
  });
});


describe('mapContentLinks', () => {
  const mapContentLinks = functions.mapContentLinks;

  it('maps needed content links/formats properties to a different name', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          {
            title: 'Some Resource',
            links: [
              {
                url: 'http://fakeurl.com/file.zip',
                format: 'application/zip; content=text/usfm',
                quality: '1080',
                unneededProperty: true,
              },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          {
            title: 'Some Resource',
            links: [
              {
                url: 'http://fakeurl.com/file.zip',
                format: 'zip',
                zipContent: 'usfm',
                quality: '1080',
              },
            ],
          },
        ],
      },
    ];
    expect(mapContentLinks(input)).toEqual(output);
  });

  it('defaults links to an empty array if there is no links property in content', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats' },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', links: [] },
        ],
      },
    ];
    expect(mapContentLinks(input)).toEqual(output);
  });

  it('defaults links to an empty array if content links is empty', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', links: [] },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', links: [] },
        ],
      },
    ];
    expect(mapContentLinks(input)).toEqual(output);
  });
});


describe('mapSubcontents', () => {
  const mapSubcontents = functions.mapSubcontents;

  it('maps needed content links/formats properties to a different name', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          {
            title: 'Some Resource',
            subcontents: [
              {
                title: 'Genesis',
                identifier: 'gen',
                sort: 0,
                formats: [1, 2, 3],
                unneededProperty: true,
              },
              {
                title: 'Revelation',
                identifier: 'rev',
                sort: 1,
                formats: [1, 2, 3],
                unneededProperty: true,
              },
              {
                title: 'Open Bible Stories',
                identifier: 'obs',
                sort: 2,
                formats: [1, 2, 3],
                unneededProperty: true,
              },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          {
            title: 'Some Resource',
            subcontents: [
              {
                name: 'Genesis',
                code: 'gen',
                sort: 0,
                category: 'bible-ot',
                links: [1, 2, 3],
              },
              {
                name: 'Revelation',
                code: 'rev',
                sort: 1,
                category: 'bible-nt',
                links: [1, 2, 3],
              },
              {
                name: 'Open Bible Stories',
                code: 'obs',
                sort: 2,
                category: '',
                links: [1, 2, 3],
              },
            ],
          },
        ],
      },
    ];
    expect(mapSubcontents(input)).toEqual(output);
  });

  it('defaults to an empty array if there is no subcontents property in content', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats' },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', subcontents: [] },
        ],
      },
    ];
    expect(mapSubcontents(input)).toEqual(output);
  });

  it('defaults to an empty array if content subcontents is empty', () => {
    const input = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', subcontents: [] },
        ],
      },
    ];
    const output = [
      {
        name: 'Some Language',
        contents: [
          { title: 'Some Resource With No Links/Formats', subcontents: [] },
        ],
      },
    ];
    expect(mapSubcontents(input)).toEqual(output);
  });
});


describe('filterSubcontents', () => {
  const filterSubcontents = functions.filterSubcontents;

  it('removes subcontents with no links', () => {
    const input = [
      {
        name: 'A Language',
        contents: [
          {
            name: 'A Resource',
            subcontents: [
              { title: 'A book' },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'A Language',
        contents: [
          {
            name: 'A Resource',
            subcontents: [],
          },
        ],
      },
    ];
    expect(filterSubcontents(input)).toEqual(output);
  });

  it('removes tA intro, process, and checking subcontents', () => {
    const input = [
      {
        name: 'A Language',
        contents: [
          {
            name: 'tanslationAcademy',
            code: 'ta',
            subcontents: [
              { title: 'Introduction to translationAcademy', code: 'intro', links: [0] },
              { title: 'translationAcademy Process', code: 'process', links: [0] },
              { title: 'translationAcademy Checking', code: 'checking', links: [0] },
              { title: 'Other Resource', code: 'or', links: [0] },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'A Language',
        contents: [
          {
            name: 'tanslationAcademy',
            code: 'ta',
            subcontents: [
              { title: 'Other Resource', code: 'or', links: [0] },
            ],
          },
        ],
      },
    ];
    expect(filterSubcontents(input)).toEqual(output);
  });
});


describe('mapSubcontentLinks', () => {
  const mapSubcontentLinks = functions.mapSubcontentLinks;

  it('maps needed properties of subcontent links to new names', () => {
    const input = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              {
                name: 'Book (a)',
                links: [
                  {
                    url: 'http://fakeurl.com/file.zip',
                    format: 'application/zip; content=text/usfm',
                    unneededProperty: true,
                  },
                  {
                    url: 'http://fakeurl.com/file.zip',
                    format: 'application/zip; content=text/usfm',
                    quality: '1080',
                    chapters: [0],
                    unneededProperty: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              {
                name: 'Book (a)',
                links: [
                  {
                    url: 'http://fakeurl.com/file.zip',
                    format: 'zip',
                    zipContent: 'usfm',
                    quality: null,
                    chapters: [],
                  },
                  {
                    url: 'http://fakeurl.com/file.zip',
                    format: 'zip',
                    zipContent: 'usfm',
                    quality: '1080',
                    chapters: [0],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    expect(mapSubcontentLinks(input)).toEqual(output);
  });

  it('defaults links to an empty array if subcontent has no links', () => {
    const input = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              { title: 'Book (a)' },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              { title: 'Book (a)', links: [] },
            ],
          },
        ],
      },
    ];
    expect(mapSubcontentLinks(input)).toEqual(output);
  });

  it('defaults links to an empty array if subcontent links is empty', () => {
    const input = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              { title: 'Book (a)', links: [] },
            ],
          },
        ],
      },
    ];
    const output = [
      {
        name: 'Language A',
        contents: [
          {
            name: 'Resource 1',
            subcontents: [
              { title: 'Book (a)', links: [] },
            ],
          },
        ],
      },
    ];
    expect(mapSubcontentLinks(input)).toEqual(output);
  });
});

describe('addEnglishNames', () => {
  const addEnglishNames = functions.addEnglishNames;

  it('adds englishNames property to each language', () => {
    const langNameData = [
      { lc: 'a', ang: 'Language A' },
    ];
    const data = [
      { code: 'a' },
    ];
    const output = [
      { code: 'a', englishName: 'Language A' },
    ];
    expect(addEnglishNames(langNameData, data)).toEqual(output);
  });

  it('defaults to an empty string if language is not found or has no english name', () => {
    const langNameData = [
      { lc: 'a' },
    ];
    const data = [
      { code: 'a' },
      { code: 'b' },
    ];
    const output = [
      { code: 'a', englishName: '' },
      { code: 'b', englishName: '' },
    ];
    expect(addEnglishNames(langNameData, data)).toEqual(output);
  });
});


describe('sortLanguageByNameOrEnglishName', () => {
  const sortLanguageByNameOrEnglishName = functions.sortLanguageByNameOrEnglishName;

  it('orders languages alphabetically', () => {
    const input = [
      { name: 'ac' },
      { name: 'aa' },
      { name: 'ab' },
      { name: 'aa' },
    ];
    const output = [
      { name: 'aa' },
      { name: 'aa' },
      { name: 'ab' },
      { name: 'ac' },
    ];
    expect(sortLanguageByNameOrEnglishName(input)).toEqual(output);
  });

  it('prefers to sort by english name first', () => {
    const input = [
      { name: 'ac', englishName: 'a' },
      { name: 'aa' },
      { name: 'ab', englishName: 'a' },
      { name: 'aa' },
    ];
    const output = [
      { name: 'ac', englishName: 'a' },
      { name: 'ab', englishName: 'a' },
      { name: 'aa' },
      { name: 'aa' },
    ];
    expect(sortLanguageByNameOrEnglishName(input)).toEqual(output);
  });
});

describe('sortContents', () => {
  const sortContents = functions.sortContents;
  const contentOrderData = {
    reg: 1,
    ulb: 2,
    udb: 3,
  };

  it('orders content by preset ordering', () => {
    const input = [
      {
        name: 'Language A',
        contents: [
          { code: 'udb' },
          { code: 'ulb' },
          { code: 'reg' },
        ],
      },
    ];
    const output = [
      {
        name: 'Language A',
        contents: [
          { code: 'reg' },
          { code: 'ulb' },
          { code: 'udb' },
        ],
      },
    ];
    expect(sortContents(contentOrderData, input)).toEqual(output);
  });

  it('pushes unrecognizeable content code to the back of the line', () => {
    const input = [
      {
        name: 'Language A',
        contents: [
          { code: 'udb' },
          { code: 'wat' },
          { code: 'reg' },
        ],
      },
    ];
    const output = [
      {
        name: 'Language A',
        contents: [
          { code: 'reg' },
          { code: 'udb' },
          { code: 'wat' },
        ],
      },
    ];
    expect(sortContents(contentOrderData, input)).toEqual(output);
  });
});