const lycos = require('../src/lycos');

(async () => {
  const chapters = await lycos
    .get('http://books.toscrape.com/')
    .links('img@src')
    .take(3)
    .asyncMap(async url => {
      await lycos.download(url, url.split('/').pop());
    });
  console.log(chapters);
})();
