const path = require('path');
const express = require('express');
const session = require('express-session');
const formData = require('express-form-data');

const PORT = 8080;

var app = express();

app.use('/quotes', express.static(path.join(__dirname, '/static/quotes')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: 'secret'
  })
);

app.use(function(req, res, next) {
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
  if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
  next();
});

function restrict(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
}

app.get('/sitemap.xml', (req, res) =>
  res.sendFile(__dirname + '/static/sitemap.xml')
);

app.get('/', function(req, res) {
  res.redirect('/login');
});

app.get('/restricted', restrict, function(req, res) {
  res.send('Wahoo! restricted area, click to');
});

app.get('/logout', function(req, res) {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/login', function(req, res) {
  res.render('login');
});

function login(req, res) {
  if (
    req.body &&
    req.body.username === 'admin' &&
    req.body.password === 'password'
  ) {
    req.session.regenerate(function() {
      req.session.user = req.body.username;
      req.session.success =
        'Authenticated as ' +
        req.body.username +
        ' click to <a href="/logout">logout</a>. ' +
        ' You may now access <a href="/restricted">/restricted</a>.';
      res.redirect('back');
    });
  } else {
    req.session.error =
      'Authentication failed, please check your ' +
      ' username and password.' +
      ' (use "admin" and "password")';
    res.redirect('/login');
  }
}

app.post('/login', express.urlencoded({ extended: true }), login);
app.post(
  '/loginMultiPartFormData',
  formData.parse({
    uploadDir: require('os').tmpdir(),
    autoClean: true
  }),
  login
);

app.post('/post', express.urlencoded({ extended: true }), function(req, res) {
  res.locals.postFieldData = req.body.postFieldData;
  res.render('postResponse');
});

app.listen(PORT, () => {
  console.log('We are live on ' + PORT);
});
