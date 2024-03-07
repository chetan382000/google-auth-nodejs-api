const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const session = require('express-session');

const CLIENT_ID = "YOUR_CLIENT_ID"

const CLIENT_SECRET = "YOUR_CLIENT_SECRET"

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/google-auth', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User model
const UserSchema = new mongoose.Schema({
    googleId: String,
    displayName: String,
    email: String,
    profileImage: String, // Adding profile image field
});

const User = mongoose.model('User', UserSchema);

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback',
},
    async (accessToken, refreshToken, profile, done) => {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            // Create new user if not exists
            user = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value,
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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/profile');
    });

app.get('/profile', (req, res) => {
    let profile = req.user;
    if (!profile) {
        res.send("you are not logged in")
    }

    res.send(profile);

});

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error(err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});


// Start server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
