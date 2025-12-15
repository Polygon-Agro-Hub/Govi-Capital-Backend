const investmentDAO = require("../dao/investment-dao");
const investmentValidation = require("../validations/investment-validation");
const uploadFileToS3 = require('../middlewares/s3upload');

exports.getApprovedInvestmentCards = async (req, res) => {
  try {
    const rows = await investmentDAO.getInvestmentRequestVarietiesFull();
    return res.status(200).json(rows);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while fetching data.");
  }
};

exports.investmentRequestInfomation = async (req, res) => {
  try {
    // Validate requestId param
    const { error } = investmentValidation.getInvestmentRequestSchema.validate({ requestId: Number(req.params.requestId) });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const requestId = req.params.requestId;
    const investmentInfo =
      await investmentDAO.getInvestmentRequestInfoByRequestId(requestId);
    if (!investmentInfo) return res.status(404).json({ error: 'Investment request not found' });
    const ongoingCultivations =
      await investmentDAO.getOngoingCultivationsForUser(
        investmentInfo.farmerId
      );
    return res.status(200).json({ investmentInfo, ongoingCultivations });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while fetching data.");
  }
};

exports.createInvestment = async (req, res) => {
  try {
    const { error } = investmentValidation.createInvestmentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
  
    let nicFront = null;
    let nicBack = null;
    let bankSlip = null;

    if (req.files?.nicFront?.[0]) {
      const file = req.files.nicFront[0];
      nicFront = await uploadFileToS3(file.buffer,file.originalname,"Govi-Capital/nic-front");
    }

    if (req.files?.nicBack?.[0]) {
      const file = req.files.nicBack[0];
      nicBack = await uploadFileToS3(file.buffer,file.originalname,"Govi-Capital/nic-back");
    }

    if (req.files?.bankSlip?.[0]) {
      const file = req.files.bankSlip[0];
      bankSlip = await uploadFileToS3(file.buffer,file.originalname,"Govi-Capital/bank-slips");
    }

    const refCode = await investmentDAO.generateInvestmentRefCode();

    const payload = {
      ...req.body,
      investerId: req.user.userId,
      nicFront,
      nicBack,
      bankSlip,
      refCode,
    };

    const result = await investmentDAO.createInvestment(payload);
    if (!result.id) return res.status(403).json({ error: "Investment creation failed" });
    return res.status(201).json({ id: result.id, refCode, message: "Investment created" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while creating investment.");
  }
};
