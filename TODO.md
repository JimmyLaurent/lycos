- polish the documentation
- add more unit tests
- clean and refactor the code
- add typescript types
- better bundling

Ideas: 
- scraper.mails(): scrape any mail found in a page
- fetcher
    .crawl({domain:, regexWhiteList, regexBlackList, unique}) => add links from every crawled web page
    .limit()
- fetcher
  .get()
  .followForm()