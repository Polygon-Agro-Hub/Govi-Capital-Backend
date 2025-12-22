const express = require('express');
require("dotenv").config();
const cors = require("cors");
const { admin, plantcare, collectionofficer, marketPlace, investment } = require('./startup/database');


const app = express();
const port = process.env.PORT || 4000;
app.use(cors({ origin: "*", }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use("/uploads", express.static("uploads"));


//------------------------------- Routes Imports -------------------------------
const heathRoutes = require("./routes/heath");
const authRoutes = require("./routes/Auth");
const investmentRoutes = require("./routes/investment");



//-------------------------------- Database Connection -------------------------------
admin.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database in index.js (admin):", err);
        return;
    }
    console.log("Connected to the MySQL database in server.js (admin).  ✅  ");
    connection.release();
});

plantcare.getConnection((err, connection) => {
    if (err) {
        console.error(
            "Error connecting to the database in index.js (plantcare):",
            err
        );
        return;
    }
    console.log(
        "Connected to the MySQL database in server.js (plantcare).  ✅  "
    );
    connection.release();
});

collectionofficer.getConnection((err, connection) => {
    if (err) {
        console.error(
            "Error connecting to the database in index.js (collectionofficer):",
            err
        );
        return;
    }
    console.log(
        "Connected to the MySQL database in server.js.(collectionofficer)  ✅  "
    );
    connection.release();
});

marketPlace.getConnection((err, connection) => {
    if (err) {
        console.error(
            "Error connecting to the database in index.js (marketPlace):",
            err
        );
        return;
    }
    console.log(
        "Connected to the MySQL database in server.js.(marketPlace)  ✅  "
    );
    connection.release();
});

investment.getConnection((err, connection) => {
    if (err) {
        console.error("Error connecting to the database in index.js (investments):", err);
        return;
    }
    console.log("Connected to the MySQL database in server.js (investments).  ✅  ");
    connection.release();
});




//------------------------------- Routes -------------------------------
app.use("", heathRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/investment", investmentRoutes);

app.get("/test", (req, res) => {
  res.send("Test route is working 11/24!");
  console.log("test route is working");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = app;
