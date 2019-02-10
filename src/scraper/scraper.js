const { parseDOM } = require('./htmlparser2');
const { selectAllGenerator, selectOne, is } = require('./css-select');
const serialize = require('./dom-serializer');
const { getLink, getLinks, getLinksGenerator } = require('./links');
const parseFormat = require('./parseFormat');

const rselector = /^([^@]*)(?:@\s*([\w-_:]+))?$/;
const rfilters = /\s*\|(?!=)\s*/;
const globalFilters = require('../utils/filters');

// TODO: it's global to all instances, maybe make it independant ?
function setGlobalFilters(filters) {
  Object.assign(globalFilters, filters);
}

function applyFilters(value, filters = []) {
  return filters.reduce((out, filter) => {
    const fn = globalFilters[filter.name];
    if (typeof fn === 'function') {
      const args = [out].concat(filter.args || []);
      const filtered = fn.apply({}, args);
      return filtered;
    } else {
      throw new Error('Invalid filter: ' + filter.name);
    }
  }, value);
}

function parseScrapingExpression(str) {
  const filters = str.split(rfilters);
  const z = filters.shift();
  const m = z.match(rselector) || [];

  return {
    selector: m[1] ? m[1].trim() : m[1],
    attribute: m[2],
    filters: filters.length ? parseFormat(filters.join('|')) : []
  };
}

function getParent(element, locationUrl = '') {
  return element.parent
    ? new ScraperNode([element.parent], locationUrl)
    : new ScraperNode([], locationUrl);
}

const HTMLPARSER_OPTIONS = {
  withDomLvl1: true,
  normalizeWhitespace: false,
  xmlMode: false,
  decodeEntities: true
};

function getText(elements = []) {
  return elements.reduce((str, element) => {
    if (element) {
      const { children, type, tagName, data } = element;
      if (type === 'text') {
        return str + data;
      } else if (
        children &&
        type !== 'comment' &&
        tagName !== 'script' &&
        tagName !== 'style'
      ) {
        return str + getText(children);
      }
      return str;
    }
  }, '');
}

const booleanRegex = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i;

function isTagType(type) {
  return ['tag', 'script', 'style'].indexOf(type) !== -1;
}

function getAttributes(element) {
  return element.attribs || {};
}

function getAttribute(element, name) {
  if (!name) {
    throw new Error('You must specify an attribute name');
  }

  if (!element || !isTagType(element.type)) return;

  if (!element.attribs) {
    element.attribs = {};
  }

  if (element.attribs.hasOwnProperty(name)) {
    // Get the (decoded) attribute
    return booleanRegex.test(name) ? name : element.attribs[name];
  }

  // Mimic the DOM and return text content as value for `option's`
  if (element.name === 'option' && name === 'value') {
    return getText(element.children);
  }

  // Mimic DOM with default value for radios/checkboxes
  if (
    element.name === 'input' &&
    (element.attribs.type === 'radio' || element.attribs.type === 'checkbox') &&
    name === 'value'
  ) {
    return 'on';
  }
}

function scrapeAll(dom, locationUrl, selector) {
  const elementIterator = scrapeAllGenerator(dom, locationUrl, selector);
  const elements = ScraperNode();
  for (let element of elementIterator) {
    elements.push(element);
  }
  return elements;
}

function* scrapeAllGenerator(dom, locationUrl, selector) {
  const expression = parseScrapingExpression(selector);
  const selectAllIterator = selectAllGenerator(expression.selector, dom);
  for (let element of selectAllIterator) {
    if (expression.attribute) {
      yield element
        ? applyFilters(
            getValue(element, expression.attribute, locationUrl),
            expression.filters
          )
        : '';
    } else {
      yield new ScraperNode([element], locationUrl);
    }
  }
}

function objectSelectorScrape(rootNode, locationUrl, selectors) {
  return Object.keys(selectors).reduce((result, selectorKey) => {
    result[selectorKey] = scrapeStringSelector(
      rootNode,
      locationUrl,
      selectors[selectorKey]
    );
    return result;
  }, {});
}

function multiSelectorScrapeAll(dom, locationUrl, rootSelector, selectors) {
  const rootNodes = scrapeAll(dom, locationUrl, rootSelector);
  return rootNodes.map(rootNode =>
    objectSelectorScrape(rootNode, locationUrl, selectors)
  );
}

function scrapeAllEntryPoint(...args) {
  if (args.length === 3) {
    return scrapeAll(...args);
  } else {
    return multiSelectorScrapeAll(...args);
  }
}

function scrape(dom, locationUrl, selector) {
  if (typeof selector === 'object') {
    return objectSelectorScrape(dom, locationUrl, selector);
  }
  return scrapeStringSelector(dom, locationUrl, selector);
}

function scrapeStringSelector(dom, locationUrl, selector) {
  const expression = parseScrapingExpression(selector);
  const element =
    expression.selector || !dom.length
      ? selectOne(expression.selector, dom)
      : dom[0];
  if (expression.attribute) {
    return element
      ? applyFilters(
          getValue(element, expression.attribute, locationUrl),
          expression.filters
        )
      : undefined;
  }
  return new ScraperNode(element ? [element] : [], locationUrl);
}

function getHtml(elements, renderOptions) {
  return serialize(elements, { ...HTMLPARSER_OPTIONS, ...renderOptions });
}

function getValue(element, name, locationUrl) {
  switch (name) {
    case 'html':
      return getHtml([element]);
    case 'text':
      return getText([element]);
    case 'link':
      return getLink(locationUrl, new ScraperNode([element], locationUrl));
    default:
      return getAttribute(element, name);
  }
}

function multiSelectorScrape(dom, locationUrl, rootSelector, selectors) {
  const rootNode = scrapeStringSelector(dom, locationUrl, rootSelector);
  return Object.keys(selectors).reduce((result, selectorKey) => {
    result[selectorKey] = scrapeStringSelector(
      rootNode,
      locationUrl,
      selectors[selectorKey]
    );
    return result;
  }, {});
}

function scrapeEntryPoint(...args) {
  if (args.length === 3) {
    return scrape(...args);
  } else {
    return multiSelectorScrape(...args);
  }
}

function getFirst(elements, locationUrl, selector) {
  return selector
    ? scrape(elements, locationUrl, selector)
    : new ScraperNode([elements[0]], locationUrl);
}

function getLast(elements, locationUrl, selector) {
  let matchedElements = elements;
  if (selector) {
    matchedElements = scrapeAll(elements, locationUrl, selector);
  }
  return matchedElements.length > 0
    ? matchedElements[matchedElements.length - 1]
    : null;
}

function getChildren(elements, locationUrl) {
  if (elements && elements.length && elements[0].children) {
    return ScraperNode(
      elements[0].children.filter(e => isTagType(e.type)),
      locationUrl
    );
  }
  return ScraperNode([], locationUrl);
}

function getNext(element, locationUrl) {
  let nextElement = element;
  while ((nextElement = nextElement.next)) {
    if (isTagType(nextElement.type)) {
      return new ScraperNode([nextElement], locationUrl);
    }
  }
}

function getNextAll(element, locationUrl) {
  let nextElement = element;
  let nextElements = ScraperNode();
  while ((nextElement = nextElement.next)) {
    if (isTagType(nextElement.type)) {
      nextElements.push(new ScraperNode([nextElement], locationUrl));
    }
  }
  return nextElements;
}

function getPrevious(element, locationUrl) {
  let previousElement = element;
  while ((previousElement = previousElement.prev)) {
    if (isTagType(previousElement.type)) {
      return new ScraperNode([previousElement], locationUrl);
    }
  }
}

function getPreviousAll(element, locationUrl, selector) {
  let previousElement = element;
  let previousElements = [];
  while ((previousElement = previousElement.prev)) {
    if (
      isTagType(previousElement.type) &&
      previousElements.indexOf(previousElement) === -1 &&
      (!selector || is(previousElement, selector))
    ) {
      previousElements.push(new ScraperNode([previousElement], locationUrl));
    }
  }
  return ScraperNode(previousElements.reverse());
}

function has(elements, selector) {
  return !!elements.scrape(selector);
}

function parseHtml(html, locationUrl = '', parserOptions = {}) {
  const dom = parseDOM(html, { ...HTMLPARSER_OPTIONS, ...parserOptions });
  return new ScraperNode(dom, locationUrl);
}

async function saveHtml(elements, path) {
  await new Promise((resolve, reject) => {
    require('fs').writeFile(path, getHtml(elements), error => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const ScraperNode = function(elements, locationUrl) {
  var elementsArray = elements || [];
  elementsArray.__proto__ = { location: locationUrl };
  elementsArray.__proto__.__proto__ = ScraperNode.prototype;
  return elementsArray;
};

ScraperNode.prototype = Object.create(Array.prototype);

ScraperNode.prototype.scrape = function(...args) {
  return scrapeEntryPoint(this, this.location, ...args);
};

ScraperNode.prototype.scrapeAll = function(...args) {
  return scrapeAllEntryPoint(this, this.location, ...args);
};

ScraperNode.prototype.scrapeAllGenerator = function(...args) {
  return scrapeAllGenerator(this, this.location, ...args);
};

ScraperNode.prototype.text = function() {
  return getText(this);
};

ScraperNode.prototype.html = function(renderOptions) {
  return getHtml(this, renderOptions);
};

ScraperNode.prototype.attribute = function(name) {
  return getAttribute(this.length ? this[0] : null, name);
};

ScraperNode.prototype.attributes = function(name) {
  return getAttributes(this, name);
};

ScraperNode.prototype.link = function(selector) {
  return getLink(this.location, this, selector);
};

ScraperNode.prototype.links = function(selector) {
  return getLinks(this.location, this, selector);
};

ScraperNode.prototype.linksGenerator = function(selector) {
  return getLinksGenerator(this.location, this, selector);
};

ScraperNode.prototype.parent = function() {
  return getParent(this.length ? this[0] : null, this.location);
};

ScraperNode.prototype.first = function(selector) {
  return getFirst(this, this.location, selector);
};

ScraperNode.prototype.last = function(selector) {
  return getLast(this, this.location, selector);
};

ScraperNode.prototype.children = function() {
  return getChildren(this, this.location);
};

ScraperNode.prototype.next = function() {
  return getNext(this.length ? this[0] : null, this.location);
};

ScraperNode.prototype.nextAll = function(selector) {
  return getNextAll(this.length ? this[0] : null, this.location, selector);
};

ScraperNode.prototype.previous = function(selector) {
  return getPrevious(this.length ? this[0] : null, this.location, selector);
};
ScraperNode.prototype.previousAll = function(selector) {
  return getPreviousAll(this.length ? this[0] : null, this.location, selector);
};
ScraperNode.prototype.is = function(selector) {
  return is(this.length ? this[0] : null, selector);
};
ScraperNode.prototype.has = function(selector) {
  return has(this, selector);
};
ScraperNode.prototype.saveHtml = function(path) {
  return saveHtml(this, path);
};

ScraperNode.prototype.eq = function(index) {
  index = parseInt(index);

  if (index < 0) {
    index = this.length + index;
  }
  return this[index] ? this[index] : new ScraperNode([], this.location);
};

module.exports = {
  parseHtml,
  setGlobalFilters
};
