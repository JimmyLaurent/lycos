const PromisePool = require('es6-promise-pool');


function enhanceIterator(iterator) {
  Object.assign(iterator.__proto__, enhanceIterator.prototype);
  return iterator;
}

//enhanceIterator.prototype = Object.create(Array.prototype);
enhanceIterator.prototype.asyncForEach = function(fn, config) {
  return this.asyncReduce(
    async (accumulator, current, index) => {
      await fn(current, index);
    },
    [],
    config
  );
};

enhanceIterator.prototype.limit = function(limit) {
  let self = this;
  async function limitAsync() {
    self = await self;
    const limitGen = function*() {
      for (let value of self) {
        if (value && limit) {
          yield value;
        } else {
          break;
        }
        limit--;
      }
    };
    return limitGen();
  }
  return enhanceIterator(limitAsync());
};

enhanceIterator.prototype.take = enhanceIterator.prototype.limit;

enhanceIterator.prototype.takeWhile = function(takeWhile) {
  if (typeof takeWhile !== 'function') {
    throw new Error('takeWhile argument must be a function');
  }

  let self = this;
  async function takeWhileAsync() {
    const takeWhileGen = function*() {
      let currentPageNumber = 0;
      let page = self.next().value;
      while (page && takeWhile(++currentPageNumber, page)) {
        yield page;
        page = self.next().value;
      }
    };
    return takeWhileGen();
  }
  return enhanceIterator(takeWhileAsync());
};

enhanceIterator.prototype.asyncReduce = function(
  reduceFn,
  accumulatorArg,
  { concurrency = 1, resolvePromise = true, onError } = {}
) {
  let accumulator = accumulatorArg;
  let iterator;

  const getPromiseIterator = function*() {
    let i = 0;
    for (let p of iterator) {
      if (resolvePromise && p && p.then) {
        yield p.then(page => reduceFn(accumulator, page, i++));
      } else {
        yield reduceFn(accumulator, p, i++);
      }
    }
  };

  const pool = new PromisePool(getPromiseIterator(), concurrency);
  pool.addEventListener('fulfilled', function(event) {
    accumulator = event.data.result;
  });

  pool.addEventListener('rejected', function(event) {
    // what to do ?
    if (onError) {
      onError(event.data.error);
    }

    console.log('Rejected: ' + event.data.error.message);
  });

  const startReducing = () =>
    Promise.resolve(this)
      .then(it => {
        iterator = it;
      })
      .then(() => pool.start())
      .then(() => accumulator);
  const startReducingFn = startReducing;

  startReducingFn.then = (...args) => startReducing().then(...args);
  return enhanceIterator(startReducingFn);
};

enhanceIterator.prototype.asyncMap = function(fn, config) {
  return this.asyncReduce(
    async (accumulator, page, index) => {
      accumulator.push(await fn(page, index));
      return accumulator;
    },
    [],
    config
  );
};

enhanceIterator.prototype.asyncFlatMap = function(fn, config) {
  return this.asyncReduce(
    async (accumulator, page, index) => {
      const result = await fn(page, index);
      if (Array.isArray(result)) {
        accumulator = [...accumulator, ...result];
      } else {
        accumulator.push(result);
      }
      return accumulator;
    },
    [],
    config
  );
};

enhanceIterator.prototype.asyncFilter = function(fn, config) {
  return this.asyncReduce(
    async (accumulator, current, index) => {
      if (await fn(current, index)) {
        accumulator.push(current);
      }
      return accumulator;
    },
    [],
    config
  );
};

enhanceIterator.prototype.toArray = function(config) {
  return this.asyncReduce(
    async (accumulator, current) => {
      accumulator.push(current);
      return accumulator;
    },
    [],
    config
  );
};


module.exports = enhanceIterator;
