const express = require("express");
const investmentEp = require("../end-point/investment-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/get-all-investment", authMiddleware, investmentEp.getApprovedInvestmentCards);

module.exports = router;