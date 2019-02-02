const path = require('path');
const fs = require('fs');

const { parseHtml } = require('../lycos');

describe('Scraper', () => {
  let html;

  beforeAll(async () => {
    html = fs.readFileSync(
      path.join(__dirname, './mock-server/static/quotes/1.html')
    );
  });

  it('scrape', () => {
    const page = parseHtml(html, 'http://localhost');

    const title = page.scrape('head title@text');
    expect(title).toMatch('Quotes to Scrape 1');
  });

  it('multi scrape', () => {
    const page = parseHtml(html, 'http://localhost');

    const quote = page.scrape({
      author: 'small.author @text',
      text: 'span.text @text',
      tags: 'div.tags > a.tag @text'
    });

    expect(quote).toEqual({
      author: 'Albert Einstein',
      tags: 'change',
      text:
        '“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”'
    });
  });

  it('multi scrape with root selector', () => {
    const page = parseHtml(html, 'http://localhost');

    const quote = page.scrape('div.quote', {
      author: 'small.author @text',
      text: 'span.text @text',
      tags: 'div.tags > a.tag @text'
    });

    expect(quote).toEqual({
      author: 'Albert Einstein',
      tags: 'change',
      text:
        '“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”'
    });
  });

  it('scrapeAll', () => {
    const page = parseHtml(html, 'http://localhost');

    const tags = page.scrapeAll('.tags > .tag@text');
    expect(tags).toEqual([
      'change',
      'deep-thoughts',
      'thinking',
      'world',
      'abilities',
      'choices',
      'inspirational',
      'life',
      'live',
      'miracle',
      'miracles',
      'aliteracy',
      'books',
      'classic',
      'humor',
      'be-yourself',
      'inspirational',
      'adulthood',
      'success',
      'value',
      'life',
      'love',
      'edison',
      'failure',
      'inspirational',
      'paraphrased',
      'misattributed-eleanor-roosevelt',
      'humor',
      'obvious',
      'simile'
    ]);
  });

  it('multi scrapeAll', () => {
    const page = parseHtml(html, 'http://localhost');

    const quotes = page.scrapeAll('div.quote', {
      author: 'small.author @text',
      text: 'span.text @text',
      tags: 'div.tags > a.tag @text'
    });

    expect(quotes).toEqual([
      {
        author: 'Albert Einstein',
        tags: 'change',
        text:
          '“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”'
      },
      {
        author: 'J.K. Rowling',
        tags: 'abilities',
        text:
          '“It is our choices, Harry, that show what we truly are, far more than our abilities.”'
      },
      {
        author: 'Albert Einstein',
        tags: 'inspirational',
        text:
          '“There are only two ways to live your life. One is as though nothing is a miracle. The other is as though everything is a miracle.”'
      },
      {
        author: 'Jane Austen',
        tags: 'aliteracy',
        text:
          '“The person, be it gentleman or lady, who has not pleasure in a good novel, must be intolerably stupid.”'
      },
      {
        author: 'Marilyn Monroe',
        tags: 'be-yourself',
        text:
          "“Imperfection is beauty, madness is genius and it's better to be absolutely ridiculous than absolutely boring.”"
      },
      {
        author: 'Albert Einstein',
        tags: 'adulthood',
        text:
          '“Try not to become a man of success. Rather become a man of value.”'
      },
      {
        author: 'André Gide',
        tags: 'life',
        text:
          '“It is better to be hated for what you are than to be loved for what you are not.”'
      },
      {
        author: 'Thomas A. Edison',
        tags: 'edison',
        text:
          "“I have not failed. I've just found 10,000 ways that won't work.”"
      },
      {
        author: 'Eleanor Roosevelt',
        tags: 'misattributed-eleanor-roosevelt',
        text:
          "“A woman is like a tea bag; you never know how strong it is until it's in hot water.”"
      },
      {
        author: 'Steve Martin',
        tags: 'humor',
        text: '“A day without sunshine is like, you know, night.”'
      }
    ]);
  });

  it('scrape first', () => {
    const page = parseHtml(html, 'http://localhost');

    const href = page.first('.tag@href');
    expect(href).toMatch('/tag/change/page/1/');
  });

  it('scrape last', () => {
    const page = parseHtml(html, 'http://localhost');

    const href = page.last('.tag@href');
    expect(href).toMatch('/tag/simile/');
  });

  it('scrape link with a scraping expression', () => {
    const page = parseHtml(html, 'http://localhost');
    const expectedLink = 'http://localhost/tag/love/';

    const link = page.scrape('.tag-item@link');
    expect(link).toEqual(expectedLink);
  });

  it('scrape links with a scraping expression', () => {
    const page = parseHtml(html, 'http://localhost');
    const expectedLinks = [
      'http://localhost/tag/love/',
      'http://localhost/tag/inspirational/',
      'http://localhost/tag/life/',
      'http://localhost/tag/humor/',
      'http://localhost/tag/books/',
      'http://localhost/tag/reading/',
      'http://localhost/tag/friendship/',
      'http://localhost/tag/friends/',
      'http://localhost/tag/truth/',
      'http://localhost/tag/simile/'
    ];

    const links = page.scrapeAll('.tag-item@link');
    expect(links).toEqual(expectedLinks);
  });

  it('children', () => {
    const page = parseHtml(html, 'http://localhost');

    const elements = page.scrape('.tags').children();
    expect(elements.length).toEqual(5);
  });

  it('next', () => {
    const page = parseHtml(html, 'http://localhost');

    const element = page.scrape('.container').next();
    expect(element[0].tagName).toEqual('footer');
  });

  it('next all', () => {
    const page = parseHtml(html, 'http://localhost');

    const nextElements = page.scrape('.keywords').nextAll();
    const nextElementsTexts = nextElements.map(e => e.text());
    expect(nextElementsTexts).toEqual([
      'change',
      'deep-thoughts',
      'thinking',
      'world'
    ]);
  });

  it('previous', () => {
    const page = parseHtml(html, 'http://localhost');

    const element = page.scrape('.footer').previous();
    expect(element.attribute('class')).toEqual('container');
  });

  it('previous all', () => {
    const page = parseHtml(html, 'http://localhost');

    const previousElements = page.scrape('.tags').previousAll();
    const previousElementsTexts = previousElements.map(e =>
      e
        .text()
        .trim()
        .replace(/(?:\r\n|\r|\n)/g, '')
    );
    expect(previousElementsTexts).toEqual([
      'by Albert Einstein        (about)',
      '“The world as we have created it is a process of our thinking. It cannot be changed without changing our thinking.”'
    ]);
  });

  it('is', () => {
    const page = parseHtml(html, 'http://localhost');

    const element = page.scrape('.container').next();
    const isFooter = element.is('footer');
    expect(isFooter).toBe(true);
  });

  it('has', () => {
    const page = parseHtml(html, 'http://localhost');

    const isTagInTags = page.scrape('.tags').has('.tag');
    expect(isTagInTags).toBe(true);
  });

  it('links with scraping expression selector', () => {
    const document = parseHtml(html, 'http://localhost/');

    const links = document.links('a[custom-href]@custom-href');
    expect(links).toEqual(['http://localhost/tag/change/page/1/']);
  });

  it('sitemap links', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links();
    expect(links).toEqual([
      'http://www.example.com/',
      'http://www.example.com/catalog?item=12&desc=vacation_hawaii',
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.example.com/catalog?item=83&desc=vacation_usa',
      'http://www.otherdomain.com',
      'http://www.google.com',
      'http://www.yahoo.com'
    ]);
  });

  it('sitemap links with filterDuplicates off', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({ filterDuplicates: false });
    expect(links).toEqual([
      'http://www.example.com/',
      'http://www.example.com/catalog?item=12&desc=vacation_hawaii',
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.example.com/catalog?item=83&desc=vacation_usa',
      'http://www.example.com/catalog?item=83&desc=vacation_usa',
      'http://www.otherdomain.com',
      'http://www.google.com',
      'http://www.yahoo.com'
    ]);
  });

  it('sitemap links with regExps filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      regExps: [
        'http://www.example.com/catalog(.+)',
        /http:\/\/www\.otherdom/gm
      ]
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=12&desc=vacation_hawaii',
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.example.com/catalog?item=83&desc=vacation_usa',
      'http://www.otherdomain.com'
    ]);
  });

  it('sitemap links with allowedDomains filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      allowedDomains: ['www.google.com', 'www.otherdomain.com']
    });
    expect(links).toEqual([
      'http://www.otherdomain.com',
      'http://www.google.com'
    ]);
  });

  it('sitemap links with priority filters', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromPriority: 0.2,
      toPriority: 0.4
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland'
    ]);
  });

  it('sitemap links with fromPriority filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromPriority: 0.7
    });
    expect(links).toEqual(['http://www.example.com/', 'http://www.yahoo.com']);
  });

  it('sitemap links with toPriority filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      toPriority: 0.4
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland'
    ]);
  });

  it('sitemap links with fromDate filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromDate: '2005-01-01'
    });
    expect(links).toEqual(['http://www.example.com/']);
  });

  it('sitemap links with toDate filter', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      toDate: '2004-11-23'
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=83&desc=vacation_usa'
    ]);
  });

  it('sitemap links with date filters', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromDate: '2004-11-27',
      toDate: '2004-12-24'
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.google.com'
    ]);
  });

  it('sitemap links with date filters and filterSitemapWithoutDate off', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromDate: '2004-11-27',
      toDate: new Date('2004-12-24'),
      filterSitemapWithoutDate: false
    });

    expect(links).toEqual([
      'http://www.example.com/catalog?item=12&desc=vacation_hawaii',
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.google.com',
      'http://www.yahoo.com'
    ]);
  });

  it('sitemap links with filters combo', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromPriority: 0.2,
      toPriority: 0.4,
      fromDate: '2004-11-27',
      toDate: '2004-12-24'
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland'
    ]);
  });

  it('sitemap links with priority filters and filterSitemapWithoutPriority off', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      fromPriority: 0.2,
      toPriority: 0.4,
      filterSitemapWithoutPriority: false
    });
    expect(links).toEqual([
      'http://www.example.com/catalog?item=12&desc=vacation_hawaii',
      'http://www.example.com/catalog?item=73&desc=vacation_new_zealand',
      'http://www.example.com/catalog?item=74&desc=vacation_newfoundland',
      'http://www.example.com/catalog?item=83&desc=vacation_usa',
      'http://www.otherdomain.com',
      'http://www.google.com'
    ]);
  });

  it('sitemap links with a filter function', () => {
    let xml = fs.readFileSync(
      path.join(__dirname, './mock-server/static/sitemap.xml')
    );
    const document = parseHtml(xml, 'http://localhost/sitemap.xml');

    const links = document.links({
      filterFn: (url, element) => {
        if (url.indexOf('google') === -1) {
          return false;
        }
        return true;
      }
    });
    expect(links).toEqual(['http://www.google.com']);
  });
});
