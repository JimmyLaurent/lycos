const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

//const { createFetcher } = require('../');
const lycos = require('../lycos');
const fetcher = lycos;

const localServerUrl = 'http://localhost:8080';

describe('Fetcher', () => {
  let proc;

  beforeAll(async () => {
    // proc = spawn('node', ['staticServer.js'], {
    //   shell: true,
    //   cwd: path.join(path.dirname(__filename), 'mock-server')
    // });
  });

  afterAll(async () => {
    //return new Promise(resolve => {
    // process.on('exit', resolve);
    // process.on('close', resolve);
    // proc.kill();
    //});
  });

  it('simple get query', async () => {
    const page = await fetcher.get(`${localServerUrl}/quotes/1.html`);

    const title = page.scrape('head title@text');
    expect(title).toMatch('Quotes to Scrape 1');
  });

  it('simple get and scrape shortcut', async () => {
    const title = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .scrape('head title@text');

    expect(title).toMatch('Quotes to Scrape 1');
  });

  it('simple post query', async () => {
    const page = await fetcher.post(
      `${localServerUrl}/post`,
      'postFieldData=hello !'
    );

    const postFieldData = page.scrape('.post-field-data@text');
    expect(postFieldData).toMatch('hello !');
  });

  it('simple post and scrape shortcut', async () => {
    const postFieldData = await fetcher
      .post(`${localServerUrl}/post`, 'postFieldData=hello !')
      .scrape('.post-field-data@text');

    expect(postFieldData).toMatch('hello !');
  });

  it('login post query', async () => {
    const postFieldData = await fetcher
      .login({
        url: `${localServerUrl}/login`,
        data: 'username=admin&password=password'
      })
      .get(`${localServerUrl}/restricted`)
      .text();

    expect(postFieldData).toMatch('Wahoo! restricted area, click to');
  });

  it('login with multipart form data post query', async () => {
    const page = await fetcher
      .login({
        url: `${localServerUrl}/loginMultiPartFormData`,
        form: { username: 'admin', password: 'password' }
      })
      .get(`${localServerUrl}/restricted`);

    const postFieldData = page.text();
    expect(postFieldData).toMatch('Wahoo! restricted area, click to');
  });

  it('paginate and takeWhile', async () => {
    let i = 0;
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .takeWhile(() => i++ < 2);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      },
      {
        location: `${localServerUrl}/quotes/2.html`,
        title: 'Quotes to Scrape 2'
      }
    ]);
  });

  it('paginate and takeWhile false should return nothing', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .takeWhile(() => false);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([]);
  });

  it('paginate and limit to one page', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .limit(1);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      }
    ]);
  });

  it('followLink', async () => {
    const page = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .followLink('.next > a');

    expect(page.location).toEqual(`${localServerUrl}/quotes/2.html`);
    expect(page.scrape('title@text')).toEqual('Quotes to Scrape 2');
  });

  it('followLinks', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/2.html`)
      .followLinks('.previous > a,.next > a');

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      },
      {
        location: `${localServerUrl}/quotes/3.html`,
        title: 'Quotes to Scrape 3'
      }
    ]);
  });

  it('followLinks when no link is found', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .followLinks({
        allowedDomains: ['notexisting.com']
      });

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }
  });

  it('paginate and limit to two pages', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .limit(2);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      },
      {
        location: `${localServerUrl}/quotes/2.html`,
        title: 'Quotes to Scrape 2'
      }
    ]);
  });

  it('paginate and limit to more pages than there is', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .limit(10);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      },
      {
        location: `${localServerUrl}/quotes/2.html`,
        title: 'Quotes to Scrape 2'
      },
      {
        location: `${localServerUrl}/quotes/3.html`,
        title: 'Quotes to Scrape 3'
      }
    ]);
  });

  it('paginate function and limit', async () => {
    let pageNumbers = [];
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate((currentPageNumber, page) => {
        pageNumbers.push(currentPageNumber);
        const link = page.scrape('.next > a@href');
        if (link) {
          return `${localServerUrl}/quotes/${link}`;
        }
      })
      .limit(4);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(pageNumbers).toEqual([1, 2, 3]);
    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      },
      {
        location: `${localServerUrl}/quotes/2.html`,
        title: 'Quotes to Scrape 2'
      },
      {
        location: `${localServerUrl}/quotes/3.html`,
        title: 'Quotes to Scrape 3'
      }
    ]);
  });

  it('paginate and limit to one page', async () => {
    const fetchIterator = await fetcher
      .get(`${localServerUrl}/quotes/1.html`)
      .paginate('.next > a@href')
      .limit(1);

    const results = [];
    for (let fetch of fetchIterator) {
      const page = await fetch();
      results.push({
        location: page.location,
        title: page.scrape('title@text')
      });
    }

    expect(results).toEqual([
      {
        location: `${localServerUrl}/quotes/1.html`,
        title: 'Quotes to Scrape 1'
      }
    ]);
  });

  // TODO: test with request fetch adapter
  // TODO: fuzz all sort of errors
});
