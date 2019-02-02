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
  return createNode([element.parent], locationUrl);
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
  const elements = [];
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
      yield createNode([element], locationUrl);
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
  const element = selectOne(expression.selector, dom);
  if (expression.attribute) {
    return element
      ? applyFilters(
          getValue(element, expression.attribute, locationUrl),
          expression.filters
        )
      : undefined;
  }
  if (element) {
    return createNode([element], locationUrl);
  }
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
      return getLink(locationUrl, createNode([element], locationUrl));
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
    : createNode([elements[0]], locationUrl);
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

function getChildren(elements) {
  return elements[0].children.filter(e => isTagType(e.type));
}

function getNext(element, locationUrl) {
  let nextElement = element;
  while ((nextElement = nextElement.next)) {
    if (isTagType(nextElement.type)) {
      return createNode([nextElement], locationUrl);
    }
  }
}

function getNextAll(element, locationUrl) {
  let nextElement = element;
  let nextElements = [];
  while ((nextElement = nextElement.next)) {
    if (isTagType(nextElement.type)) {
      nextElements.push(createNode([nextElement], locationUrl));
    }
  }
  return nextElements;
}

function getPrevious(element, locationUrl) {
  let previousElement = element;
  while ((previousElement = previousElement.prev)) {
    if (isTagType(previousElement.type)) {
      return createNode([previousElement], locationUrl);
    }
  }
}

function getPreviousAll(element, locationUrl) {
  let previousElement = element;
  let previousElements = [];
  while ((previousElement = previousElement.prev)) {
    if (isTagType(previousElement.type)) {
      previousElements.push(createNode([previousElement], locationUrl));
    }
  }
  return previousElements;
}

function has(elements, selector) {
  return !!createNode(elements).scrape(selector);
}

function parseHtml(html, locationUrl = '', parserOptions = {}) {
  const dom = parseDOM(html, { ...HTMLPARSER_OPTIONS, ...parserOptions });
  return createNode(dom, locationUrl);
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

function createNode(elements, locationUrl) {
  elements.location = locationUrl;
  elements.scrapeAll = (...args) =>
    scrapeAllEntryPoint(elements, locationUrl, ...args);
  elements.scrapeAllGenerator = (...args) =>
    scrapeAllGenerator(elements, locationUrl, ...args);
  elements.scrape = (...args) =>
    scrapeEntryPoint(elements, locationUrl, ...args);
  elements.text = () => getText(elements);
  elements.html = () => getHtml(elements);
  elements.attribute = name => getAttribute(elements[0], name);
  elements.attributes = () => getAttributes(elements[0]);
  elements.link = selector => getLink(locationUrl, elements, selector);
  elements.links = selector => getLinks(locationUrl, elements, selector);
  elements.linksGenerator = selector =>
    getLinksGenerator(locationUrl, elements, selector);
  elements.parent = () => getParent(elements[0], locationUrl);
  elements.first = selector => getFirst(elements, locationUrl, selector);
  elements.last = selector => getLast(elements, locationUrl, selector);
  elements.children = () => getChildren(elements);
  elements.next = () => getNext(elements[0], locationUrl);
  elements.nextAll = () => getNextAll(elements[0], locationUrl);
  elements.previous = () => getPrevious(elements[0], locationUrl);
  elements.previousAll = () => getPreviousAll(elements[0], locationUrl);
  elements.is = selector => is(elements[0], selector);
  elements.has = selector => has(elements, selector);
  elements.saveHtml = path => saveHtml(elements, path);

  return elements;
}

module.exports = {
  parseHtml,
  setGlobalFilters
};
