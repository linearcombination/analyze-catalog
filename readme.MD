# Requirements

[Node and npm](https://nodejs.org)

# Get Started

1. Clone this repo - `git clone <repo_url> && cd <repo_name>`
2. Install dependencies - `npm i`
3. Start the app - `npm start`
4. Browse to `localhost.8081`

# Endpoints

- `/` - straight from catalog
- `/massaged` - catalog processed and combined with additional json files
- `/massaged/json` - download the massaged and combined json

# Tools

- `node compare.js <old.json> <new.json>` - compare two massaged json files semantically, ignoring order of links, contents, and subcontents.

# Combining Extra JSON Files

- Add the JSON file (must adhere to the structure) into `data` folder.
- In `index.js`, require it.

``` javascript
const extraData = require('./data/extra.json');
```

- In `index.js`, inside `addAdditionalData()`, concat the data.

``` javascript
const dataToAdd = manualData
    .concat(gogsData)
    .concat(handmadeData)
    .concat(extraData)
    .map(...);
```

# End Result Structure

``` javascript
[
  language,
]

language = {
  code: 'en',
  name: 'English',
  englishName: 'English' || '',
  direction: 'ltr' || 'rtl',
  contents: [
    content,
  ]
}

// Resource for a language
content = {
  code: 'ulb',
  name: 'Unlocked Literal Bible',
  subject: 'Bible' || 'Bible stories' || 'Some other',
  description: 'Some text' || '',
  checkingLevel: '1' || '2' || '3' || '',
  links: [
    link,
  ],
  subcontents: [
    subcontent,
  ]
}

// Book/project of a resource
subcontent = {
  code: 'gen',
  name: 'Genesis',
  sort: 0,
  category: 'bible-ot' || 'bible-nt',
  links: [
    link,
  ]
}

// Same for both content and subcontent
link = {
  url: 'https://google.com',
  format: 'any',
  zipContent: 'any' || '',
  quality: 'any' || null,
}
```