const lycos = require('../src/lycos');

(async () => {
  const quotes = await lycos
    .get('http://quotes.toscrape.com/')
    .paginate('.next > a')
    .asyncFlatMap(pageScraper =>
      pageScraper.scrapeAll('.quote', {
        author: '.author@text',
        text: '.text@text'
      })
    );

  console.log(quotes);
})();
