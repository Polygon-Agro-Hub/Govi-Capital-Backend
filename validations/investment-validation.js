const Joi = require("joi");

exports.getInvestmentRequestSchema = Joi.object({
  requestId: Joi.number().integer().positive().required()
});