const axios = require('./fetcher/enhancedAxios');
const { parseHtml, setGlobalFilters } = require('./scraper/scraper');
const enhanceIterator = require('./utils/enhanceIterator');
const addScraperShortcuts = require('./utils/addScraperShortcuts');
const FormData = require('form-data');

const defaultCorsProxy = 'https://cors-anywhere.herokuapp.com/';

function Lycos({ corsProxy: cp, ...config } = {}) {
  let lycosInstance;

  function lycos() {
    const globalRequestConfig = config;
    const corsProxy = cp === true ? defaultCorsProxy : cp;

    let fetch = requestConfig => {
      return axios({
        ...requestConfig,
        url: encodeURI(
          corsProxy ? corsProxy + requestConfig.url : requestConfig.url
        )
      }).then(response => response.data);
    };

    function paginate(paginate, config) {
      if (typeof paginate !== 'string' && typeof paginate !== 'function') {
        throw new Error('paginate argument must be a string or function');
      }

      const paginateGenFn = function*() {
        let page;
        let fetchFnWithPageUpdate = config =>
          lycosNode(config, p => {
            page = p;
            return p;
          });

        yield fetchFnWithPageUpdate(config);

        let currentPageNumber = 0;
        // TODO: check if returned urls are valid
        while (true) {
          if (typeof paginate === 'string') {
            let url = page.link(paginate);
            if (!url) {
              break;
            }
            yield fetchFnWithPageUpdate({ url });
          } else {
            let paginateResult = paginate(++currentPageNumber, page);
            if (!paginateResult) {
              break;
            }
            if (typeof paginateResult === 'string') {
              yield fetchFnWithPageUpdate({ url: paginateResult });
            } else if (typeof paginateResult === 'object') {
              yield fetchFnWithPageUpdate(paginateResult);
            }
          }
        }
      };

      const paginateIterator = paginateGenFn();
      return enhanceIterator(paginateIterator);
    }

    async function followLink(config, selector) {
      const page = await lycosNode(config);
      const url = page.link(selector);
      return scraperLycosNode({ url });
    }

    function followLinks(config, selector) {
      async function followLinks() {
        const page = await lycosNode(config);
        const urlsIterator = page.linksGenerator(selector);
        const fetchIteratorFn = function*() {
          for (let url of urlsIterator) {
            yield lycosNode({ url });
          }
        };
        return fetchIteratorFn();
      }
      const iteratorPromise = followLinks();
      return enhanceIterator(iteratorPromise);
    }

    async function trackChanges(
      fetch,
      onChange,
      { selector, selectFn, interval = 10, clearIntervalOnChange = false } = {}
    ) {
      let oldPage = await fetch();
      const intervalId = setInterval(async () => {
        const page = await fetch(); 

        let contentFromPage;
        let contentFromOldPage;

        if (selectFn) {
          contentFromPage = await selectFn(page);
          contentFromOldPage = await selectFn(oldPage);
        } else if (selector && selector.indexOf('@') !== -1) {
          contentFromPage = page.scrape(selector);
          contentFromOldPage = oldPage.scrape(selector);
        } else if (selector && selector.indexOf('@') === -1) {
          contentFromPage = page.scrape(selector).html();
          contentFromOldPage = oldPage.scrape(selector).html();
        } else {
          ontentFromPage = page.html();
          contentFromOldPage = oldPage.html();
        }

        if (contentFromPage !== contentFromOldPage) {
          await onChange({
            page,
            oldPage,
            contentFromPage,
            contentFromOldPage
          });

          if (clearIntervalOnChange) {
            clearInterval(intervalId);
            return;
          }
          oldPage = page;
        }
      }, interval * 1000);
      return () => clearInterval(intervalId);
    }

    async function process(requestConfig) {
      requestConfig.headers = {
        ...requestConfig.headers,
        ...globalRequestConfig.headers
      };

      const html = await fetch(requestConfig);

      if (requestConfig.saveCookies && requestConfig.headers) {
        globalRequestConfig.headers = Object.assign(
          globalRequestConfig.headers || {},
          requestConfig.headers
        );
      }
      const page = parseHtml(html, requestConfig.url);
      return page;
    }

    function lycosNode(config = {}, postFn = p => p, preFn = p => p) {
      const requestConfig = { ...globalRequestConfig, ...config };
      const fetch = () =>
        Promise.resolve(preFn)
          .then(() => process(requestConfig))
          .then(postFn);

      const lycosNode = fetch;
      lycosNode.location = requestConfig.url;

      lycosNode.then = (resolve, reject) => fetch().then(resolve, reject);
      lycosNode.catch = (...args) => fetch().catch(...args);
      lycosNode.paginate = fn => enhanceIterator(paginate(fn, requestConfig));
      lycosNode.followLink = (...args) => followLink(requestConfig, ...args);
      lycosNode.followLinks = (...args) => followLinks(requestConfig, ...args);
      lycosNode.trackChanges = (...args) => trackChanges(fetch, ...args);
      lycosNode.request = (...args) =>
        addScraperShortcuts(fetch().then(() => lycosInstance.request(...args)));
      lycosNode.get = (...args) =>
        addScraperShortcuts(fetch().then(() => lycosInstance.get(...args)));
      lycosNode.post = (...args) =>
        addScraperShortcuts(fetch().then(() => lycosInstance.post(...args)));

      return lycosNode;
    }

    function scraperLycosNode(config) {
      return addScraperShortcuts(lycosNode(config));
    }

    lycos.request = function(config) {
      return scraperLycosNode(config);
    };

    lycos.get = function(url, config) {
      return scraperLycosNode({ ...config, url, method: 'get' });
    };

    lycos.post = function(url, data, config) {
      return scraperLycosNode({ ...config, url, data, method: 'post' });
    };

    lycos.getAll = function(iterator, config = {}) {
      const generatorLycosNodeFn = function*() {
        for (let url of iterator) {
          yield scraperLycosNode({ ...config, url });
        }
      };
      return enhanceIterator(generatorLycosNodeFn());
    };

    lycos.login = function(config) {
      const loginRequestConfig = {
        method: 'post',
        saveCookies: true,
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status <= 302,
        ...config
      };

      return scraperLycosNode(loginRequestConfig);
    };

    lycos.parseHtml = function(...args) {
      return parseHtml(...args);
    };

    lycos.parseCurrentPageHtml = function(url) {
      if (
        window &&
        window.location &&
        window.location.href &&
        window.document &&
        window.document.documentElement &&
        window.document.documentElement.outerHTML
      ) {
        return parseHtml(
          window.document.documentElement.outerHTML,
          url || window.location.href
        );
      } else {
        throw new Error(
          'parseCurrentPageHtml is only available in a browser context'
        );
      }
    };

    lycos.createInstance = function(config) {
      return Lycos(config);
    };

    lycos.setFetchAdapter = function(fetchFn) {
      fetch = fetchFn;
    };

    lycos.setGlobalFilters = function(...args) {
      return setGlobalFilters(...args);
    };

    lycos.download = async function(url, path) {
      const response = await axios({
        ...globalRequestConfig,
        url,
        responseType: 'arraybuffer'
      });
      await new Promise((resolve, reject) => {
        require('fs').writeFile(path, response.data, error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    };

    // Third party library to handle form data
    lycos.FormData = FormData;
    lycos.async = enhanceIterator;

    return lycos;
  }

  lycosInstance = lycos();
  return lycosInstance;
}

module.exports = Lycos();
