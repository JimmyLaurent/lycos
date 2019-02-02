
# 🐾 lycos.js
> All the goodies you'll ever need to scrape the web

## In-browser Playground

You can try the library on codesandbox, it uses a cors proxy service to let you query contents from any website from your browser.

* CodeSandbox: https://codesandbox.io/s/njm2p72m


## Installation
```sh
yarn add lycos
# or
npm i lycos
```
## Features

- ⚡️️ All in one package to fetch and scrape data from the web
- ⭐ Node & Browser Support
- 💡 Powerful declarative API
- 🚀 Blazingly fast (supports concurrency)
- 🔧 Extensible

## Quick Example

```js
const lycos = require('lycos');

// Get the page url and paginate through all
// the next pages to extract quotes
const quotes = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .asyncFlatMap(pageScraper =>
    pageScraper.scrapeAll('.quote', {
      author: '.author@text',
      text: '.text@text'
    })
  );
```
```json
<!-- quotes -->
[
  { 
  "author": "Albert Einstein", 
  "text": "“The world as we have created it is a process of our thinking.“"
  },
  ...
]
```