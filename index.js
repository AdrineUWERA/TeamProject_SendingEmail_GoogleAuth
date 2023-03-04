require("dotenv").config();
const express = require("express");
const session = require("express-session");
const Sequelize = require("sequelize");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");

require('./auth')

const app = express();
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

// const sequelize = new Sequelize({
//   dialect: "postgres",
//   host: process.env.DATABASE_HOST,
//   port: process.env.DATABASE_PORT,
//   username: process.env.DATABASE_USERNAME,
//   password: process.env.DATABASE_PASSWORD,
//   database: process.env.DATABASE_NAME,
// });

// const User = sequelize.define("user", {
//   email: { type: Sequelize.STRING, allowNull: false, primaryKey: true },
//   name: { type: Sequelize.STRING, allowNull: false },
// });

// User.sync();

// const SentEmail = sequelize.define("sent_email", {
//   sender: { type: Sequelize.STRING, allowNull: false },
//   recipients: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false },
//   subject: { type: Sequelize.STRING, allowNull: true },
//   body: { type: Sequelize.STRING, allowNull: true },
// });

// SentEmail.sync();

function isLoggedIn(req, res, next) {
  req.user ? next() : res.redirect("/auth/google");
}

app.get("/", (req, res) => {
  res.send("<a href='/auth/google' >Login with google</a>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

app.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: "/send-email",
    failureRedirect: "/auth/failure"
  })
);

app.get("/auth/failure", (req, res) => {
  res.send("Not logged in! Something went wrong.");
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.get("/send-email", isLoggedIn, (req, res) => {
  console.log(`Welcome ${req.user.displayName}`)
  res.render("sendEmail.ejs");
});

app.post("/send-email", isLoggedIn,  (req, res) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(403).json({
      message: "Not logged in",
    });
  }
  const token = header.split(" ")[1];
  const userInfo = jwt.verify(token, process.env.TOKEN_SECRET);
  console.log(userInfo);
  res.send(userInfo)

  const { recipientEmails, subject, body } = req.body;

  const senderEmail = req.user.email;
  const senderName = req.user.displayName;

  const msg = {
    to: recipientEmails,
    from: { name: senderName, email: senderEmail },
    subject: subject,
    text: body,
  };

  sgMail.send(msg).then((response) => {
    console.log("Email sent");
    SentEmail.create({
      sender: senderEmail,
      recipients: [recipientEmails],
      subject: subject,
      body: body,
    })
      .then((res) => {
        console.log("Email sent successfully and saved to database!");
        return;
      })
      .catch((err) => {
        console.log(err.message);
      });
  });
  
});

app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect("/");
  console.log({"messsage": "Successfully logged out"})
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
