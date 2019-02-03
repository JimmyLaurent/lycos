# API Reference

## Performing requests

Lycos uses axios under the hood to perform requests.

Any `request config` is similar to what you would use with axios (check axios [documentation](https://github.com/axios/axios#request-config))

There is one additionnal property `saveCookies` that you can add to any `request config` to preserve cookies between requests. 

### request
Send a request and return a page scraper.

##### lycos.request(config)

**Example**

```js
const pageScraper = await lycos.request({
  method: 'GET',
  url: 'http://quotes.toscrape.com',

  // Will save cookies cookies from the header
  saveCookies: true
});
```

### get
Send a get request and return a page scraper.

##### lycos.get(url[, config])

**Example**

```js
const pageScraper = await lycos.get('http://quotes.toscrape.com');
```

### getAll
Perform multiple get requests when you iterate over the returned page scraper iterator.

##### lycos.getAll(urls)

**Example**

```js
const pageScraperIterator = await lycos.getAll([
  'http://quotes.toscrape.com/tag/inspirational/',
  'http://quotes.toscrape.com/tag/love/'
]);
```

### post

Send a post request and return a page scraper.

> Note: lycos supports "multipart/form-data" post requests with the help of [Form-Data](https://github.com/form-data/form-data) library

##### lycos.post(url[, data[, config])

**Example**

```js
// POST request
const pageScraper = await lycos.post('http://example.com/register', { 
  username: 'john.doe',
  password: 'secret'
});

// POST request with "multipart/form-data" encoding
const pageScraper = await lycos.post('http://example.com/register', null, {
  form: { 
    username: 'john.doe', 
    password: 'secret' 
  }
});
```

### login

Perform a login request and return a page scraper.

##### lycos.login(config)

**Examples**

```js
const lycos = require('lycos');

// Send a post query to the login url, then get
// the restricted page with the cookie obtained
const restrictedPageTitle = await lycos
  .login({
    url: 'http://www.website.com/login',
    data: 'username=admin&password=password'
  })
  .get('http://www.website.com/restricted');
  .scrape('title@text');
```


## Follow urls

### paginate

Return an iterator which allow to iterate over all pagination links.

##### lycos.(request | get | post | login).paginate(selector | function)

**Examples**

```js
// Get pagination links from a selector
const results = await lycos
    .get('http://quotes.toscrape.com/')
    .paginate('.next > a')
    .asyncMap(pageScraper => (...));

// Get pagination links from a function
// it uses the returned url to fech the next url
// it will iterate until paginate function return null
const results = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(
    (index, page) =>
      index < 10 && `http://quotes.toscrape.com/page/${index + 1}/`
  )
  .asyncMap(pageScraper => (...));

// The paginate function can also returns a request config
const results = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(
    (index, page) =>
      index < 10 && {
        method: 'GET',
        url: `http://quotes.toscrape.com/page/${index + 1}/`
      }
  )
  .asyncMap(pageScraper => (...));

```

### followLink
Scrape the first url in the page and return a pageScraper for this url.

##### lycos.(request | get | post | login).followLink([selector])

**Examples**

```js
// Get the given url, extract the first link
// and return a page scraper from this extracted link
const pageScraper = await lycos
    .get('http://quotes.toscrape.com')
    .followLink();
```

### followLinks
Scrape links from a page and allow to iterate over all links found corresponding to the given filters.

##### lycos.(request | get | post | login).followLinks([selector])
##### lycos.(request | get | post | login).followLinks([{filters}])


#### Links Filters

| Filter                           | Description                                                             | Type             |
|----------------------------------|-------------------------------------------------------------------------|------------------|
| **selector**                     | Filter links matching the selector                                      | string           |
| **regExps**                      | Filter links matching the regular expressions                           | array of regExps |
| **allowedDomains**               | Filter links matching the list of allowed domains                       | array of string  |
| **filterFn**                     | Filter function with this signature: (url, element) => boolean          | function         |
| **filterDuplicates**             | Filter duplicate links (default: true)                                  | boolean          |
| **fromPriority**                 | Filter links with an inferior priority than the given one (in sitemap)  | number           |
| **toPriority**                   | Filter links with a superior priority than the given (in sitemap)       | number           | 
| **filterSitemapWithoutPriority** | Keep links without priority (in sitemap)                                | boolean          |
| **fromDate**                     | Filter links with a date anterior to the given date (in sitemap)        | date or string   |
| **toDate**                       | Filter links with a date posterior to the given date (in sitemap)       | date or string   |
| **filterSitemapWithoutDate**     | Keep links without date (in sitemap)                                    | boolean          |


**Examples**

```js
// Fetch the given url, extract links according to the 
// regular expressions and allowed domains and return
// an iterator wich allow to iterate over those links
const lycosNodeCollection = await lycos
    .get('http://quotes.toscrape.com')
    .followLinks({
        regExps: ['J-K-Rowling', 'Einstein'],
        allowedDomains: ['quotes.toscrape.com']
    })
    .asyncMap(pageScraper => (...));

// Fetch the sitemap, extract links according to the 
// prority and date filters
const lycosNodeCollection = await lycos
    .get('http://quotes.toscrape.com/sitemap.xml')
    .followLinks({
        fromPriority: 0.1,
        toPriority: 0.5,
        fromDate: '2000-01-20',
        toDate: '2020-01-20'
    })
    .asyncMap(pageScraper => (...));

```


## Loading html

### parseHtml

Parse html and return a page scraper.

##### lycos.parseHtml(html[, url])

> Note: the url parameter is used to construct absolute urls when we scrape links

**Example**

```js
// Parse the html from the first parameter
// and uses the second parameter to set the location of the
const pageScraper = lycos.parseHtml('<html>...</html>', 'http://www.example.com');
```

### parseCurrentPageHtml

##### lycos.parseCurrentPageHtml([url])

Parse the html from the current page (only available from browsers).

**Example**

```js
const pageScraper = lycos.parseCurrentPageHtml();
```

## Scraping

### Selectors syntax and filters

All the scraping methods use a enhanced css selector syntax to perform queries on the dom.

Those selectors can return partial dom elements with all the scraping methods available, or a simple type (int, string, etc...)

You can also apply `filters` with a pipe syntax to transform the data you're extracting (See filters [section](api-reference?id=filters) for more details).

**Examples**

```js
// Scrape head, then scrape title from head,
// and extract title text
const headElement = pageScraper.scrape('head');
const titleElement = headElement.scrape('title');
const title = titleElement.text();

// Scrape an element text
const title = pageScraper.scrape('head > title@text');

// Scrape the innerHtml of the head tag
const headHtml = pageScraper.scrape('head@html');

// Scrape a path/url and convert it to an absolute url if necessary
const absoluteUrl = pageScraper.scrape('a@link');
const absoluteUrl = pageScraper.scrape('img[src]@link');

// Scrape the scr attribute value of the first img found
const imgSrc = pageScraper.scrape('img@src');

// Scrape the title and apply trim on it
const title = pageScraper.scrape('head > title@text | trim');

// Scrape the title, apply trim on it, and reverse it
const title = pageScraper.scrape('head > title@text | trim | reverse');
```

### Use of scraping methods
You can use scraping methods on page/elements scrapers or you can also chain them after requests methods (get, post, request, login). 

**Example**

```js
// Scrape title via page scraper
const pageScraper = await lycos.get('http://quotes.toscrape.com');
const title = pageScraper.scrape('title@text');

// Scrape title via chaining method
const title = await lycos
    .get('http://quotes.toscrape.com')
    .scrape('title@text');
```

### scrape

Scrape and return data/element.

##### scraper.scrape(selector)
##### scraper.scrape(object)
##### scraper.scrape(scopeSelector, object)


**Example**

```js
// Scrape the title of the current page
const title = pageScraper.scrape('head > title@text');

// Scrape an object
const quote = pageScraper.scrape({
  author: 'small.author @text',
  text: 'span.text @text'
});

// Scrape an object from a specific scope
const quote = pageScraper.scrape('div.quote', {
  author: 'small.author @text',
  text: 'span.text @text'
});

```

### scrapeAll
Scrape and return an array of data/elements.

##### scraper.scrapeAll(selector)
##### scraper.scrapeAll(scopeSelector, object)


**Example**

```js
// Scrape quote elements
const quoteElements = pageScraper.scrapeAll('div.quote');

// Scrape all the elements matching the scope selector "div.quote"
// then for each one, scrape an object with author and text properties
const quotes = pageScraper.scrapeAll('div.quote', {
  author: 'small.author @text',
  text: 'span.text @text'
});
```


### scrapeAllGenerator
Scrape and return an iterator yielding data/elements.

##### scraper.scrapeAllGenerator(selector)
##### scraper.scrapeAllGenerator(scopeSelector, object)

**Example**

```js
// Scrape the title of the current page
const quoteIterator = pageScraper.scrapeAll('div.quote');

// Scrape all the elements matching the scope selector "div.quote"
// then for each one, scrape an object with author and text properties
const quoteIterator = pageScraper.scrapeAll('div.quote', {
  author: 'small.author @text',
  text: 'span.text @text'
});
```

### text
Get the combined text contents of each element in the set of matched elements, including their descendants.

##### scraper.text()

**Example**

```js
// Get page title
const title = pageScraper.scrape('title').text();
```

### html
Get the HTML contents of an element.

##### scraper.html()

**Example**

```js
// Get html of the head tag
const headTagHtml = pageScraper.scrape('head').html();
```

### attribute
Get an attribute value of an element.

##### scraper.attribute()

**Example**

```js
// Get the id of the first div in the page
const divId = pageScraper.scrape('div').attribute('id');
```

### attributes
Get an object containing attributes of an element.

**Example**

```js
// Get the id of the first div in the page
const attributes = pageScraper.scrape('div').attributes();
```

### link
Get the first link and transform it to an absolute url if necessary.

##### scraper.link([selector])

```js
// Get the url from the href of the first "a" tag
const url = pageScraper.link('a');
```

### links
Get links matching the filters and transform them to absolute urls if necessary.

##### scraper.links([selector])
##### scraper.links([filters])

#### Links Filters

| Filter                           | Description                                                             | Type             |
|----------------------------------|-------------------------------------------------------------------------|------------------|
| **selector**                     | Filter links matching the selector                                      | string           |
| **regExps**                      | Filter links matching the regular expressions                           | array of regExps |
| **allowedDomains**               | Filter links matching the list of allowed domains                       | array of string  |
| **filterFn**                     | Filter function with this signature: (url, element) => boolean          | function         |
| **filterDuplicates**             | Filter duplicate links (default: true)                                  | boolean          |
| **fromPriority**                 | Filter links with an inferior priority than the given one (in sitemap)  | number           |
| **toPriority**                   | Filter links with a superior priority than the given (in sitemap)       | number           | 
| **filterSitemapWithoutPriority** | Keep links without priority (in sitemap)                                | boolean          |
| **fromDate**                     | Filter links with a date anterior to the given date (in sitemap)        | date or string   |
| **toDate**                       | Filter links with a date posterior to the given date (in sitemap)       | date or string   |
| **filterSitemapWithoutDate**     | Keep links without date (in sitemap)                                    | boolean          |

**Example**

```js
// Get urls from the href of all the "a" tags
const urls = pageScraper.links('a');

// Get links from "quotes.toscrape.com" containing "Einstein"
const urls = pageScraper.links({
  allowedDomains: ['quotes.toscrape.com'],
  regExps: ['Einstein']
});
```

### linksGenerator
Get links matching the filters and transform them to absolute urls if necessary, return an iterator (useful to iterate over big sitemap files).

##### scraper.linksGenerator([selector])
##### scraper.linksGenerator([{filters}])


#### Links Filters

| Filter                           | Description                                                             | Type             |
|----------------------------------|-------------------------------------------------------------------------|------------------|
| **selector**                     | Filter links matching the selector                                      | string           |
| **regExps**                      | Filter links matching the regular expressions                           | array of regExps |
| **allowedDomains**               | Filter links matching the list of allowed domains                       | array of string  |
| **filterFn**                     | Filter function with this signature: (url, element) => boolean          | function         |
| **filterDuplicates**             | Filter duplicate links (default: true)                                  | boolean          |
| **fromPriority**                 | Filter links with an inferior priority than the given one (in sitemap)  | number           |
| **toPriority**                   | Filter links with a superior priority than the given (in sitemap)       | number           | 
| **filterSitemapWithoutPriority** | Keep links without priority (in sitemap)                                | boolean          |
| **fromDate**                     | Filter links with a date anterior to the given date (in sitemap)        | date or string   |
| **toDate**                       | Filter links with a date posterior to the given date (in sitemap)       | date or string   |
| **filterSitemapWithoutDate**     | Keep links without date (in sitemap)                                    | boolean          |


**Example**

```js
// Get urls from the href of all the "a" tags
const urlIterator = pageScraper.linksGenerator('a');

// Get links from "quotes.toscrape.com" containing "Einstein"
const urlIterator = pageScraper.linksGenerator({
  allowedDomains: ['quotes.toscrape.com'],
  regExps: ['Einstein']
});
```

### parent
Get the parent of an element.

##### scraper.parent()

**Example**

```js
// Get the parent of the first element with "tag" class
const tagParentElement = pageScraper.scrape('.tag').parent();
```

### first
Get the first element in the set of matched elements.

##### scraper.first([selector])

**Example**

```js
// Get the first element in the set of elements with class "tag"
const firstTagElement = pageScraper.scrapeAll('.tag').first();

// Get the first element with "tag" class (alias of scrape(selector))
const firstTagElement = pageScraper.first('.tag');
```


### last
Get the last element in the set of matched elements.

##### scraper.last([selector])

**Example**

```js
// Get the last element in the set of elements with class "tag"
const lastTagElement = pageScraper.scrapeAll('.tag').last();

// Get the last element with class "tag"
const lastTagElement = pageScraper.last('.tag');
```

### children
Gets the children of an element.

##### scraper.children()

**Example**

```js
// Get the children elements of the first element with "quote" class
const quoteChildrenElements = pageScraper.scrape('.quote').children();
```

### next
Gets the next sibling of an element.

##### scraper.next()

**Example**

```js
// Get the the next sibling of the first element with "quote" class
const afterQuoteElement = pageScraper.scrape('.quote').next();
```

### nextAll
Get all following siblings of an element.

##### scraper.nextAll()

**Example**

```js
// Get the the next sibling of the first element with "quote" class
const afterQuoteElements = pageScraper.scrape('.quote').nextAll();
```

### previous
Gets the previous sibling of an element.

##### scraper.previous()

**Example**

```js
// Get the the previous sibling of the first element with "quote" class
const previousQuoteElement = pageScraper.scrape('.quote').previous();
```

### previousAll
Get all preceding siblings of an element.

##### scraper.previousAll()

**Example**

```js
// Get the the previous sibling of the first element with "quote" class
const beforeQuoteElements = pageScraper.scrape('.quote').previousAll();
```

### is
Check an element against a selector.

##### scraper.is(selector)

**Example**

```js
// Check if element match the selector
const isQuoteElement = element.is('.quote');
```

### has
Check if an element have a descendant that matches the given selector.

##### scraper.has(selector)

```js
// Check if an element match the selector
const pageHasQuote = pageScraper.has('.quote');
```

## Filters
Filters are a way to transform extracted data through selectors.

### setGlobalFilters
Add new filters

##### lycos.setGlobalFilters(filters)

**Example**

```js
// Add your own trim filter
lycos.setGlobalFilters({
  trim: value => (typeof value === 'string' ? value.trim() : value)
});

// Use the trim filter to trim the author name
const quotesBis = await lycos
  .get('http://quotes.toscrape.com')
  .scrape('.author@text | trim');
```

## Working with collections
The following tools help you to iterate over collections.

### asyncForEach
Executes a provided async function once for each iterator element.

##### lycosIterator.asyncForEach(fn[,options])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

**Example**

```js
// Iterate over each page scraper
let results = [];
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .asyncForEach(pageScraper => {
    results.push(pageScraper.scrape('title@text'));
  });

// Iterate over page of quotes, 5 by 5
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(index => `http://quotes.toscrape.com/page/${index + 1}/`)
  .limit(10)
  .asyncForEach(pageScraper => {
    console.log(pageScraper.scrape('title@text'));
  }, { 
    concurrency: 5, 
    onError: e => console.log(e.message) 
  });

// Iterate without resolving promises
await lycos
  .getAll([
    'http://quotes.toscrape.com/tag/inspirational/',
    'http://quotes.toscrape.com/tag/love/'
  ])
  .asyncForEach(
    async lycosNode => {
      await lycosNode
        .paginate('.next > a')
        .take(2)
        .asyncForEach(pageScraper => {
          console.log(pageScraper.location);
        });
    },
    {
      resolvePromise: false
    }
  );
// Displays: 
// http://quotes.toscrape.com/tag/inspirational/
// http://quotes.toscrape.com/tag/inspirational/page/2/
// http://quotes.toscrape.com/tag/love/
// http://quotes.toscrape.com/tag/love/page/2/
```

### take
Returns a number of elements from the start of the collection.

> Alias: limit

##### lycosIterator.take(number)

**Example**

```js
// Returns an iterator with a maximum number of values of 2 elements
const iterator = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .take(2);

const iterator = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .limit(2);
```

### takeWhile
Returns elements from the collection as long as the predicate function returns true.

The predicate function signature is: (index, pageScraper) => boolean

##### lycosIterator.takeWhile(fn)

**Example**

```js
// Iterate while pages contain quotes
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .takeWhile((index, pageScraper) => pageScraper.has('.quote'))
  .asyncMap(...);
```

### asyncReduce

Executes an async reducer function on each iterator element of the collection resulting in a single output value.

The reduce function signature is: (current, accumulator, index) => newAccumulator

##### lycosIterator.asyncReduce(reduceFn[, accumulator[, options]])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

**Example**

```js
// Reduce over all paginate pages
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .asyncReduce((pageScraper, accumulator, index) => {
    accumulator.push(pageScraper.scrape('title@text'));
    return accumulator;
  }, []);
```

### asyncMap
Creates an array with the results of calling the provided async function on every element of the iterator.

##### lycosIterator.asyncMap(fn[, options])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

```js
// Iterate over page of quotes, 5 by 5, and returns page titles
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(index => `http://quotes.toscrape.com/page/${index + 1}/`)
  .limit(10)
  .asyncMap(pageScraper => pageScraper.scrape('title@text'), { 
    concurrency: 5
  });
```

### asyncFlatMap
First maps each element using an async mapping function, then flattens the result into a new array. It is identical to a map followed by a flat of depth 1.

##### lycosIterator.asyncFlatMap(fn[, options])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

```js
// Iterate over page of quotes, 5 by 5, and returns page quotes in a flat array
await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(index => `http://quotes.toscrape.com/page/${index + 1}/`)
  .limit(10)
  .asyncFlatMap(pageScraper => pageScraper.scrapeAll('.quote', {
      author: '.author@text',
      text: '.text@text'
    }), { 
    concurrency: 5
  });
```

### asyncFilter
Creates a new array with all elements that pass the test implemented by the provided function.

##### lycosIterator.asyncFilter(fn[, options])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

```js
// Iterate over page of quotes, 5 by 5, and returns page quotes in a flat array
const pagesScraper = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate(index => `http://quotes.toscrape.com/page/${index + 1}/`)
  .limit(10)
  .asyncFilter(pageScraper => pageScraper.has('.quote'))
  .asyncMap(pageScraper => (...));
```

### toArray
 Retrieve all the elements contained in the jQuery set, as an array.

##### lycosIterator.toArray([options])

| Option                           | Description                                                             | Type             | Default          |
|----------------------------------|-------------------------------------------------------------------------|------------------|------------------|
| **concurrency**                  | Run iteration in parallel with a concurrency limit                      | integer          | 1                |
| **resolvePromise**               | Resolve iterator element when running iterations                        | boolean          | false            |
| **onError**                      | Function called when an error occurs                                    | function         | -                |

> Note: you cannot always run the iteration in parallel, ex: paginate needing the next page url from the current page.

```js
// Get 3 pages scrapers in an array
const pagesScrapers = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .limit(3)
  .toArray();
```

## Miscellaneous

### createInstance

##### lycos.createInstance([config])

Create a new instance of lycos allowing to have different configurations and cookie sessions.

The `config` object is similar to the axios `config` with the exception of one additional property `corsProxy`

##### corsProxy (boolean | url): cors proxy service. 
Default value is false. If corsProxy is set to true, it uses this proxy: https://cors-anywhere.herokuapp.com/

**Example**

```js
const lycosInstance = await lycos.createInstance({ 
  baseURL: 'https://some-domain.com/api/',

  // Use the default cors proxy service
  corsProxy: true
 });
```

### download
Download a file (only for node js).

##### lycos.download(url, path)

**Example**

```js
// Download an video file "bunny.mp4" in the current directory
await lycos.download('https://www.example.com/bunny.mp4', 'bunny.mp4');
```

### setFetchAdapter
Set a fetch adapter to replace or override axios and do every request as you intend to. It must be compliant with the axios api or some functionalities will not work (login, session handling, maybe more).

**Example**

```js
lycos.setFetchAdapter(requestConfig => customAxios().then(response => response.data));
```

### saveHtml

Save html from a scraper (only for node js).

##### scraper.saveHtml(path)

**Example**

```js
// Save pageScraper html in "index.html"
await pageScraper.saveHtml('index.html');
```

