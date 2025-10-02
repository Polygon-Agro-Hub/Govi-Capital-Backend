const authDAO = require("../dao/Auth-dao")
const authValidation = require("../validations/Auth-validation");


exports.test = async (req, res) => {
  try {

    res.send("Test working.......");
  } catch (err) {
    if (err.isJoi) {
      // Validation error
      return res.status(400).json({ error: err.details[0].message });
    }

    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while fetching data.");
  }
};