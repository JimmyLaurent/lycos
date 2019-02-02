const enhanceIterator = require('./enhanceIterator');

function addSraperShortcuts(object) {
  const newObject = {};
  Object.keys(object).forEach(k => {
    newObject[k] = (...args) => object[k](...args);
  });
  [
    'scrapeAll',
    'scrapeAllGenerator',
    'scrape',
    'text',
    'html',
    'attribute',
    'attributes',
    'link',
    'links',
    'linksGenerator',
    'parent',
    'first',
    'last',
    'children',
    'next',
    'nextAll',
    'previous',
    'previousAll',
    'is',
    'has'
  ].forEach(k => {
    newObject[k] = function(...args) {
      async function doFn() {
        const page = await object;
        return page[k](...args);
      }
      return enhanceIterator(doFn());
    };
  });

  newObject.then = (...args) => object.then(...args);

  return enhanceIterator(newObject);
}

module.exports = addSraperShortcuts;
