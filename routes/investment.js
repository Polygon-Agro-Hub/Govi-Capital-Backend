const express = require("express");
const investmentEp = require("../end-point/investment-ep");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.get(
    "/get-all-investment", 
    authMiddleware, 
    investmentEp.getApprovedInvestmentCards
);

router.get(
    "/investment-request-infomation/:requestId", 
    authMiddleware, 
    investmentEp.investmentRequestInfomation
);

module.exports = router;