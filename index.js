const express = require("express");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { User, SentEmail } = require("./models/models");
const passport = require("./auth");

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

function isLoggedIn(req, res, next) {
  console.log("the cookie", req.cookies);
  const token = req.cookies.token;
  const verify = jwt.verify(token, process.env.JWT_SECRET);
  console.log("verify", verify); 
  if (verify.email) {
    req.user = verify;
    next();
  } else{
    res.redirect("/auth/google")
  } 
}

app.get("/", (req, res) => {
  res.render('home.ejs')
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
  }),
  async function (req, res) {
    const token = jwt.sign(
      { email: req.user.email, displayName: req.user.displayName },
      process.env.JWT_SECRET
    );
    console.log("token", token);
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
          res.render("Error.ejs")
          console.log(err.message);
        });
    }
    console.log("User saved successfully");
    res.redirect("/send-email");
  }
);

app.get("/auth/failure", (req, res) => {
  res.render("Error.ejs")
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.get("/send-email", isLoggedIn, async (req, res) => {
  res.render("sendEmail.ejs");
});

app.post("/send-email", isLoggedIn, async (req, res) => {
  const { recipientEmails, subject, body } = req.body;
  const recipientsEmails = recipientEmails.split(/\s*,\s*/);
  console.log(recipientsEmails)
  const senderEmail = req.user.email;
  const senderName = req.user.displayName;

  const msg = {
    to: recipientsEmails,
    from: { name: senderName, email: senderEmail },
    subject: subject,
    text: body,
  };
  try {
    sgMail.send(msg).then((response) => {
      console.log("Email sent");
      SentEmail.create({
        sender: senderEmail,
        recipients: recipientsEmails,
        subject: subject,
        body: body,
      })
        .then((res) => {
          console.log("Email saved");
          console.log("Email sent successfully and saved to database!");
        })
        .catch((err) => {
          res.render("Error.ejs")
          console.log(err.message);
        });
    });
    res.render("sent.ejs"); 
  } catch (error) {
    console.log(error);
    res.render("Error.ejs")
  }
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      res.render("Error.ejs")
      console.log(err);
    }
    res.clearCookie("token");
    req.session.destroy();
    console.log("logged out successfully");
    res.redirect("/");
  }); 
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
