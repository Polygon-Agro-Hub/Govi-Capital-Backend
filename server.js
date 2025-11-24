// server.js (reorganized to mirror your first working server.js)
require("dotenv").config();

console.log("Environment Variables:");
console.log("----------------------");
console.log("PORT:", process.env.PORT);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_NAME_AD:", process.env.DB_NAME_AD);
console.log("DB_NAME_PC:", process.env.DB_NAME_PC);
console.log("DB_NAME_CO:", process.env.DB_NAME_CO);
console.log("DB_NAME_MP:", process.env.DB_NAME_MP);
console.log("DB_NAME_DS:", process.env.DB_NAME_DS);
console.log("AUTHOR:", process.env.AUTHOR);
console.log("MARKETPRICE:", process.env.MARKETPRICE);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
console.log("----------------------");

const express = require('express');
const cors = require("cors");

// Database pools (same as your new file)
const { admin, plantcare, collectionofficer, marketPlace, dash } = require('./startup/database');

// Route imports (keep what your new server used; add more like the first when needed)
const heathRoutes = require("./routes/heath");
const authRoutes = require("./routes/Auth");
// If you add other routes later, require them here and mount them below.
// const routes = require('./routes/Admin');
// const collectionOfficerRoutes = require('./routes/CollectionOfficer');
// ... etc

const app = express();
const port = process.env.PORT || 4000;

// CORS & body parsers
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (same as both files)
app.use("/uploads", express.static("uploads"));

// ------------------------------- Database Connection checks -------------------------------
admin.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database in server.js (admin):", err);
    return;
  }
  console.log("Connected to the MySQL database in server.js (admin).  ✅  ");
  connection.release();
});

plantcare.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database in server.js (plantcare):", err);
    return;
  }
  console.log("Connected to the MySQL database in server.js (plantcare).  ✅  ");
  connection.release();
});

collectionofficer.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database in server.js (collectionofficer):", err);
    return;
  }
  console.log("Connected to the MySQL database in server.js.(collectionofficer)  ✅  ");
  connection.release();
});

marketPlace.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database in server.js (marketPlace):", err);
    return;
  }
  console.log("Connected to the MySQL database in server.js.(marketPlace)  ✅  ");
  connection.release();
});

// (Optional) dash pool - uncomment if you need like in your first file
// dash.getConnection((err, connection) => {
//   if (err) {
//     console.error("Error connecting to the database in server.js (dash):", err);
//     return;
//   }
//   console.log("Connected to the MySQL database in server.js.(dash)  ✅  ");
//   connection.release();
// });

// ------------------------------- Base path & Routes -------------------------------
const BASE_PATH = "/agro-api/admin-api";

// keep heath route mounted as in your new file
app.use("", heathRoutes);

// mount auth route under BASE_PATH (keeps naming consistent with first file style)
app.use(BASE_PATH + "/api/auth", authRoutes);

// Example: if you add more routes later replicate the first file style
// app.use(BASE_PATH + process.env.AUTHOR, routes);
// app.use(BASE_PATH + process.env.AUTHOR, collectionOfficerRoutes);
// app.use(BASE_PATH + process.env.AUTHOR, routesNewws);
// app.use(BASE_PATH + process.env.AUTHOR, CollectionCenterRoutes);
// app.use(BASE_PATH + process.env.MARKETPRICE, MarketPrice);
// app.use(BASE_PATH + '/api/market-place', MarketPlace);
// app.use(BASE_PATH + '/api/crop-calendar', CropCalendar);
// ... etc

// ------------------------------- Test route -------------------------------
app.get(BASE_PATH + "/test", (req, res) => {
  res.send("Test route is working (reorganized)!");
  console.log("test route is working");
});

// ------------------------------- Start server -------------------------------
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = app;
