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