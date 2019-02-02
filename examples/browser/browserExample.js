const lycos = require('../../src/lycos');

async function doJob() {
  try {
    const lycosInstance = lycos.createInstance({ corsProxy: true });
    const results = await lycosInstance
      .get('http://quotes.toscrape.com')
      .paginate('.next > a')
      .limit(3)
      .asyncMap(page => {
        console.log(page.location);
        return page.scrapeAll('div.quote', {
          author: 'small.author@text',
          text: 'span.text@text',
          tags: 'div.tags > a.tag@text'
        });
      });
    console.log(results);
  } catch (e) {
    console.error(e);
  }
}

doJob();
