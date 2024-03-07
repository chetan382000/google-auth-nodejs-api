// app.js

const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');
const session = require('express-session');

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/facebook-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User model
const UserSchema = new mongoose.Schema({
  facebookId: String,
  displayName: String,
  email: String,
  profileImage: String,
});

const User = mongoose.model('User', UserSchema);

// Configure passport
passport.use(new FacebookStrategy({
  clientID: 'YOUR_FACEBOOK_APP_ID',
  clientSecret: 'YOUR_FACEBOOK_APP_SECRET',
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'email', 'photos']
},
  async (accessToken, refreshToken, profile, done) => {
    // Check if user already exists
    console.log(profile);
    let user = await User.findOne({ facebookId: profile.id });
    if (!user) {
      // Create new user if not exists
      user = new User({
        facebookId: profile.id,
        displayName: profile.displayName,
        email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
        profileImage: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
      });
      await user.save();
    }
    return done(null, user);
  }
));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});

// Middleware
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
  res.send('Home page');
});

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/profile');
  });

app.get('/profile', (req, res) => {
  res.send(req.user);
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Start server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});