# Examples

## Fetch and scrape

```js
const lycos = require('lycos');

// Fetch the given url and return a page scraper
const page = await lycos.get('http://quotes.toscrape.com');

// Scrape all the quotes elements
const quoteElements = page.scrapeAll('.quote');

// For each quote element, scrape the text and the author 
const quotes = quoteElements.map(element => ({
    text: element.scrape('.text').text(),
    author: element.scrape('.author').text()
}));

// Shortcut to scrape the collection of quotes
const quotes = page.scrapeAll('.quote', {
  author: '.author@text',
  text: '.text@text'
});

// Shortcut to fetch and scrape
const quotes = await lycos
  .get('http://quotes.toscrape.com')
  .scrapeAll('.quote', {
    author: '.author@text',
    text: '.text@text'
  });
```

## Paginate and limit to three pages

```js
const lycos = require('lycos');

// Fetch the given url, iterate over 
// the three next pages and return an
// object containing the page utl and title
const results = await lycos
  .get('http://quotes.toscrape.com/')
  .paginate('.next > a')
  .limit(3)
  .asyncMap(p => ({
    location: page.location, // url of the page
    title: page.scrape('title@text')
  }));
```

## Login and scrape a restricted page

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

## Scrape and transform data on the fly

```js
const lycos = require('lycos');

// Add your own trim filter
lycos.setGlobalFilters({
  trim: value => (typeof value === 'string' ? value.trim() : value)
});

// Use the trim filter to trim the author name
const author = await lycos
  .get('http://quotes.toscrape.com')
  .scrape('.author@text | trim');
```

## Scrape pages from extracted links

```js
const lycos = require('lycos');

// Fetch the given url, extract links according to the 
// regular expressions and allowed domains and
// iterate over those links
const results = await lycos
  .get('http://quotes.toscrape.com')
  .followLinks({
    regExps: ['J-K-Rowling', 'Einstein'],
    allowedDomains: ['quotes.toscrape.com']
  })
  .asyncMap(page => ({
    location: page.location,
    title: page.scrape('title@text')
  }));
```

## Scrape pages from a sitemap

```js
const lycos = require('lycos');

// Fetch the sitemap, extract links according to the 
// prority and date filters and iterate over those links
const titles = await lycos
  .get('http://quotes.toscrape.com/sitemap.xml')
  .followLinks({
    fromPriority: 0.1,
    toPriority: 0.5,
    fromDate: '2000-01-20',
    toDate: '2020-01-20'
  })
  .asyncMap(page => page.scrape('title@text'));
```

## Advanced real world example

Scrape all courses (including chapters videos) from all categories of coursehunters website.

```js
const lycos = require('lycos');
const fs = require('fs');

async function scrapeCourseChapters({ title, url }) {
  return {
    title,
    url,
    chapters: await lycos.get(url).scrapeAll('.lessons-list__li', {
      name: 'span[itemprop="name"]@text',
      url: 'link[itemprop="url"]@href'
    })
  };
}

async function scrapeCategoryCourses(categoryUrl) {
  return await lycos
    .get(categoryUrl)
    .paginate('.pagination__a[rel="next"]')
    .asyncFlatMap(p =>
      p.scrapeAll('article', {
        title: '.standard-course-block__original@text',
        url: 'a[itemprop="mainEntityOfPage"]@href'
      })
    )
    .asyncMap(scrapeCourseChapters, { concurrency: 50 })
    .asyncFilter(c => c.chapters.length);
}

async function scrapeCategory(categoryUrl) {
  return {
    category: categoryUrl.split('/').pop(),
    courses: await scrapeCategoryCourses(categoryUrl)
  };
}

(async () => {
  const results = await lycos
    .get('https://coursehunters.net')
    .links('.menu-aside__a')
    .asyncMap(scrapeCategory, { concurrency: 6 })
    .asyncFilter(c => c.courses.length);

  // results
  // --------------------------------------------------------------------
  // {
  //   frontend: [
  //     {
  //       title: 'a frontend course',
  //       url: 'http://ch.com/a-frontend-course',
  //       chapters: [
  //         {
  //           name: 'first chapter',
  //           url: 'http://ch.com/a-frontend-course/first-chapter.mp4'
  //         },
  //         ...
  //       ]
  //     }
  //   ],
  //   backend...
  // }
  // --------------------------------------------------------------------
  fs.writeFileSync('courses.json', JSON.stringify(results, null, 2), 'utf8');
})();
```