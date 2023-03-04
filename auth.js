const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const { User } = require('../models');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id).then(user => {
    done(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  User.findOrCreate({
    where: { googleId: profile.id },
    defaults: { name: profile.displayName, email: profile.emails[0].value }
  }).then(([user]) => {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    done(null, { user, token });
  }).catch(done);
}));
