function parseArgs(str) {
  var args = [];
  var re = /"([^"]*)"|'([^']*)'|([^ \t,]+)/g;
  var m;

  while ((m = re.exec(str))) {
    args.push(m[2] || m[1] || m[0]);
  }

  return args;
}

function parseFormat(str) {
  return str.split(/ *\| */).map(function(call) {
    var parts = call.split(':');
    var name = parts.shift();
    var args = parseArgs(parts.join(':'));

    return {
      name: name,
      args: args
    };
  });
}

module.exports = parseFormat;
