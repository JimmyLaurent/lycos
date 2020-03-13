
<div align="center">
<h1>🐾 lycos.js</h1>
<p>All the goodies you'll ever need to scrape the web</p>
</div>

## Documentation

* [Get Started](https://jimmylaurent.github.io/lycos/#/README)
* [Examples](https://jimmylaurent.github.io/lycos/#/examples)
* [API Reference](https://jimmylaurent.github.io/lycos/#/api-reference)


## In-browser Playground

You can try the library on codesandbox, it uses a cors proxy fetcher to let you grab contents from any website inside your browser.

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

// Fetch the given url and return a page scraper
const page = await lycos.get('http://quotes.toscrape.com');

// Scrape all the quotes elements
const quoteElements = page.scrapeAll('.quote');

// For each quote element, scrape the text and the author 
const quotes = quoteElements.map(element => ({
    text: element.scrape('.text').text(),
    author: element.scrape('.author').text()
}));

// Shortcut to scrape the collection of quotes
const quotes = page.scrapeAll('.quote', {
  author: '.author@text',
  text: '.text@text'
});

// Shortcut to fetch and scrape
const quotes = await lycos
  .get('http://quotes.toscrape.com')
  .scrapeAll('.quote', {
    author: '.author@text',
    text: '.text@text'
  });
```

## Credits

__&#8226; FB55:__ his work reprensents the core of this library.

__&#8226; Matt Mueller and cheerio contributors :__
A good portion of the code and concepts are copied/derived from the cheerio and x-ray libraries.

## License

MIT © 2019 [Jimmy Laurent](https://github.com/JimmyLaurent)

