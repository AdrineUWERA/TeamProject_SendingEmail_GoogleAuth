const express = require("express");
const Sequelize = require("sequelize");
// const sequelize = new Sequelize(process.env.DATABASE_URL);
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const session = require("express-session");
const cookieParser = require('cookie-parser');

require("dotenv").config();

const app = express();
app.use(cookieParser());
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

const User = sequelize.define("user", {
  email: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false },
});

User.sync();

const SentEmail = sequelize.define("sent_email", {
  sender: { type: Sequelize.STRING, allowNull: false },
  recipients: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false },
  subject: { type: Sequelize.STRING, allowNull: true },
  body: { type: Sequelize.STRING, allowNull: true },
});

SentEmail.sync();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // Here you can check if the user is already registered in your database
      const user = {
        email: profile.emails[0].value,
        displayName: profile.displayName,
        accessToken,
        refreshToken,
      };
      done(null, user);
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

function isLoggedIn(req, res, next) {console.log("the cookie", req.cookies)
  const token = req.cookies.token;
  const verify = jwt.verify(token, process.env.JWT_SECRET);
  req.user.email === verify.email ? next() : res.redirect("/auth/google");
}

app.get("/", (req, res) => {
  res.send("<a href='/auth/google' >Login with google</a>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/failure",
    // successRedirect: "/send-email",
  })
  , async function (req, res) {
    const token = jwt.sign({ email: req.user.email, name: req.user.displayName }, process.env.JWT_SECRET);
    console.log("token", token)
    res.cookie("token", token);
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      User.create({
        name: req.user.displayName,
        email: req.user.email,
      })
        .then(() => {
          console.log("User saved");
        })
        .catch((err) => {
          console.log(err.message);
        });
    }
    console.log("User saved successfully")
    res.redirect("/send-email");
  }
);

app.get("/auth/failure", (req, res) => {
  res.send("something went wrong");
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.get("/send-email", isLoggedIn, async (req, res) => {
  res.render("sendEmail.ejs");
});

// app.get("/send-email", isLoggedIn, async (req, res) => {
  // const user = await User.findOne({ where: { email: req.user.email } });
  // if (!user) {
  //   User.create({
  //     name: req.user.displayName,
  //     email: req.user.email,
  //   })
  //     .then(() => {
  //       console.log("User saved");
  //     })
  //     .catch((err) => {
  //       console.log(err.message);
  //     });
  // }

//   res.render("sendEmail.ejs");
// });

app.post("/send-email", isLoggedIn, async (req, res) => {
  // const header = req.headers.authorization;
  // if (!header) {
  //   return res.status(403).json({
  //     message: "Not logged in",
  //   });
  // }
  // const token = header.split(" ")[1];
  // const userInfo = jwt.verify(token, process.env.TOKEN_SECRET);
  // console.log(userInfo);

  const { recipientEmails, subject, body } = req.body;
  // const senderEmail = userInfo.email;
  // const senderName = userInfo.name;

  const senderEmail = req.user.email;
  const senderName = req.user.displayName;

  const msg = {
    to: recipientEmails,
    from: { name: senderName, email: senderEmail },
    subject: subject,
    text: body,
  };
  try {
  sgMail.send(msg).then((response) => {
    console.log("Email sent");
    SentEmail.create({
      sender: senderEmail,
      recipients: [recipientEmails],
      subject: subject,
      body: body,
    })
      .then((res) => {
        console.log("Email saved");
        console.log("Email sent successfully and saved to database!");
      })
      .catch((err) => {
        console.log(err.message);
      });
  });
  res.redirect("/send-email");

  } catch (error) {
    console.log(error)
    res.status(500).send("Error sending email.");
  }
});

app.get("/logout", (req, res) => {
  req.logout;
  req.session.destroy();
  // res.send("Successfully logged out")
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
