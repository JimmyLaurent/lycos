const enhanceIterator = require('./enhanceIterator');

function addSraperShortcuts(object) {
  Object.assign(object.__proto__, addSraperShortcuts.prototype);
  return enhanceIterator(object);
}

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
  addSraperShortcuts.prototype[k] = function(...args) {
    const self = this;
    async function doFn() {
      const page = await self;
      if(this.debug) debugger;
      return page[k](...args);
    }
    return enhanceIterator(doFn());
  };
});

addSraperShortcuts.prototype.debug = function() {
  this.debug = true;
}

module.exports = addSraperShortcuts;
