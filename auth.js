const passport = require('passport');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,   
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/google/callback",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
      const user = {
        email: profile.emails[0].value,
        displayName: profile.displayName,
        accessToken,
        refreshToken,
      };
      done(null, user);
    }
));
passport.serializeUser((user, done)=>{
  done(null, user)
})
passport.deserializeUser((user, done)=>{
  done(null, user)
})
