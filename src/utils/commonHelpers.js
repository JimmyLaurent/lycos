function getRegExpInstance(regex) {
  if (regex instanceof RegExp) {
    return regex;
  } else if (typeof regex === 'string') {
    return new RegExp(regex);
  }
  throw new Error('Regex invalid');
}

function parseDate(dateStr, name, throwOnError = true) {
  if (dateStr) {
    try {
      return new Date(Date.parse(dateStr));
    } catch (e) {
      if (throwOnError) {
        throw new Error(`Could 't parse date "${name}"`);
      }
    }
  }
}

module.exports = { getRegExpInstance, parseDate };
