const investmentDAO = require("../dao/investment-dao");
const investmentValidation = require("../validations/investment-validation");

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
    const requestId = req.params.requestId;
    const investmentInfo =
      await investmentDAO.getInvestmentRequestInfoByRequestId(requestId);
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

    const payload = {
      ...req.body,
      investerId: req.user.userId,
    };

    const result = await investmentDAO.createInvestment(payload);

    if (!result.id) return res.status(403).json({ error: "Investment creation failed" });
    return res.status(201).json({ id: result.id, message: "Investment created" });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("An error occurred while creating investment.");
  }
};
