const express = require("express");
const investmentEp = require("../end-point/investment-ep");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

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

router.post(
    "/post-investment", 
    authMiddleware,
    upload.fields([
      { name: 'nicFront', maxCount: 1 },
      { name: 'nicBack', maxCount: 1 },
      { name: 'bankSlip', maxCount: 1 },
    ]), 
    investmentEp.createInvestment
);

module.exports = router;