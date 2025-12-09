const express = require("express");
const investmentEp = require("../end-point/investment-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/test", investmentEp.test);


module.exports = router;