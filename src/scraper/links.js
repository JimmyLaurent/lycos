const Url = require('url-parse');
const { getRegExpInstance, parseDate } = require('../utils/commonHelpers');
const normalizeUrl = require('./normalize-url');

const linkSelector = [
  'a[href]',
  'img[src]',
  'script[src]',
  'link[href]',
  'source[src]',
  'track[src]',
  'img[src]',
  'frame[src]',
  'iframe[src]',
  'loc'
].join(',');

function getBasePath(page) {
  return page.scrape('head > base @ href');
}

function getRawLink(elementOrStr) {
  if (!elementOrStr) {
    return null;
  }
  let link = null;
  if (typeof elementOrStr === 'string') {
    link = elementOrStr;
  } else {
    const element = elementOrStr;
    const hasHref = element.attribute('href');
    const hashSrc = element.attribute('src');
    const locTag =
      element.length > 0 && element[0].tagName === 'loc'
        ? element.text()
        : null;

    if (hasHref) {
      link = hasHref;
    } else if (hashSrc) {
      link = hashSrc;
    } else if (locTag) {
      link = locTag;
    } else {
      return null;
    }
  }

  return link.trim();
}

function getBaseUrl(locationUrl, basePath) {
  if (basePath && basePath.indexOf('://') !== -1) {
    return basePath;
  } else {
    const { protocol, host, pathname } = new Url(locationUrl);
    let baseUrl = `${protocol}//${host}`;
    if (baseUrl && basePath && basePath.indexOf('/') !== 0) {
      baseUrl = new Url(basePath, baseUrl).toString();
    } else {
      baseUrl = new Url(pathname, baseUrl).toString();
    }
    return baseUrl;
  }
}

function getLink(locationUrl, page, selector = linkSelector) {
  const basePath = getBasePath(page);
  const baseUrl = getBaseUrl(locationUrl, basePath);
  const elementOrStr = page.scrape(selector);

  return getAbsoluteLink(elementOrStr, baseUrl);
}

function getLinks(locationUrl, page, selectorOrFilters) {
  const links = [];
  const linkIterator = getLinksGenerator(locationUrl, page, selectorOrFilters);
  for (let link of linkIterator) {
    links.push(link);
  }
  return links;
}

function getAbsoluteLink(elementOrStr, baseUrl) {
  const rawLink = getRawLink(elementOrStr);
  if (rawLink) {
    if (rawLink.startsWith('http')) {
      return rawLink;
    } else {
      const link = new Url(rawLink, baseUrl).toString();
      if (link.startsWith('http')) {
        return link;
      }
    }
  }
}

function isAllowedDomains(url, allowedDomains) {
  if (allowedDomains && allowedDomains.length > 0) {
    const parsedUrl = new Url(url);
    return allowedDomains.includes(parsedUrl.hostname);
  }
  return true;
}

function isCompliantWithRegExps(url, regExps = []) {
  for (let regExp of regExps) {
    const regExpInstance = getRegExpInstance(regExp);
    if (regExpInstance.test(url)) {
      return true;
    }
  }
  return regExps.length === 0;
}

function isUnique(url, urlSet) {
  const normalizedUrl = normalizeUrl(url);
  if (!urlSet.has(normalizedUrl)) {
    urlSet.add(normalizedUrl);
    return true;
  }
  return false;
}

function getLinkSelector(selectorOrFilters) {
  if (typeof selectorOrFilters === 'string') {
    return selectorOrFilters;
  } else if (
    typeof selectorOrFilters === 'object' &&
    selectorOrFilters.selector &&
    typeof selectorOrFilters.selector === 'string'
  ) {
    return selectorOrFilters.selector;
  }
  return linkSelector;
}

function getLinkFilters(selectorOrFilters) {
  const defaultFilters = {
    filterDuplicates: true,
    regExps: [],
    allowedDomains: [],
    filterFn: () => true
  };

  if (!selectorOrFilters || typeof selectorOrFilters === 'string') {
    return defaultFilters;
  }
  return {
    filterDuplicates:
      selectorOrFilters.filterDuplicates !== undefined
        ? selectorOrFilters.filterDuplicates
        : defaultFilters.filterDuplicates,
    regExps: selectorOrFilters.regExps || defaultFilters.regExps,
    allowedDomains:
      selectorOrFilters.allowedDomains || defaultFilters.allowedDomains,
    filterFn: selectorOrFilters.filterFn || defaultFilters.filterFn
  };
}

function getSitemapFilters(selectorOrFilters) {
  if (typeof selectorOrFilters === 'object') {
    return selectorOrFilters;
  }
  return {};
}

function respectDateRules(dateStr, fromDate, toDate, filterSitemapWithoutDate) {
  if (!dateStr) {
    return filterSitemapWithoutDate === false ||
      (filterSitemapWithoutDate === undefined && !fromDate && !toDate)
      ? true
      : false;
  }

  if (typeof fromDate === 'string') {
    fromDate = parseDate(fromDate, 'fromDate');
  }

  if (typeof toDate === 'string') {
    toDate = parseDate(toDate, 'toDate');
  }

  const date = parseDate(dateStr, '', false);
  if (fromDate && date <= fromDate) {
    return false;
  }
  if (toDate && date >= toDate) {
    return false;
  }
  return true;
}

function respectPriorityRules(
  priority,
  fromPriority,
  toPriority,
  filterSitemapWithoutPriority
) {
  priority = parseFloat(priority);
  if (!priority) {
    return filterSitemapWithoutPriority === false ||
      (filterSitemapWithoutPriority === undefined &&
        fromPriority === undefined &&
        toPriority === undefined)
      ? true
      : false;
  }
  if (fromPriority && priority <= fromPriority) {
    return false;
  }
  if (toPriority && priority >= toPriority) {
    return false;
  }
  return true;
}

function respectSitemapRules(selectorOrFilters, element) {
  const {
    fromPriority,
    toPriority,
    filterSitemapWithoutPriority,
    fromDate,
    toDate,
    filterSitemapWithoutDate
  } = getSitemapFilters(selectorOrFilters);

  if (fromPriority || toPriority || filterSitemapWithoutPriority) {
    if (typeof element === 'string') {
      throw new Error(
        'Scraping expression not compatible with sitemap filters'
      );
    }
    if (
      !respectPriorityRules(
        element.parent().scrape('priority@text'),
        fromPriority,
        toPriority,
        filterSitemapWithoutPriority
      )
    ) {
      return false;
    }
  }

  if (fromDate || toDate || filterSitemapWithoutDate) {
    if (typeof element === 'string') {
      throw new Error(
        'Scraping expression not compatible with sitemap filters'
      );
    }
    if (
      !respectDateRules(
        element.parent().scrape('lastmod@text'),
        fromDate,
        toDate,
        filterSitemapWithoutDate
      )
    ) {
      return false;
    }
  }
  return true;
}

function* getLinksGenerator(locationUrl, page, selectorOrFilters) {
  const selector = getLinkSelector(selectorOrFilters);
  const basePath = getBasePath(page);
  const baseUrl = getBaseUrl(locationUrl, basePath);
  const elementsIterator = page.scrapeAllGenerator(selector);
  const urlSet = new Set();
  const {
    filterDuplicates,
    regExps,
    allowedDomains,
    filterFn
  } = getLinkFilters(selectorOrFilters);

  for (let elementOrStr of elementsIterator) {
    const url = getAbsoluteLink(elementOrStr, baseUrl);
    if (
      url &&
      isAllowedDomains(url, allowedDomains) &&
      isCompliantWithRegExps(url, regExps) &&
      (!filterDuplicates || isUnique(url, urlSet)) &&
      filterFn(url, elementOrStr) &&
      respectSitemapRules(selectorOrFilters, elementOrStr)
    )
      yield url;
  }
}

module.exports = { getLink, getLinks, getLinksGenerator };
