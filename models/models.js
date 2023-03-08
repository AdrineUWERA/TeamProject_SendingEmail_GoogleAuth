const Sequelize = require("sequelize");
require("dotenv").config();

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

// User.sync();

const SentEmail = sequelize.define("sent_email", {
  sender: { type: Sequelize.STRING, allowNull: false },
  recipients: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: false },
  subject: { type: Sequelize.STRING, allowNull: true },
  body: { type: Sequelize.STRING, allowNull: true },
});

// SentEmail.sync();

sequelize.sync();

module.exports = {User, SentEmail};
