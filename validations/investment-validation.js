const Joi = require("joi");

exports.getInvestmentRequestSchema = Joi.object({
  requestId: Joi.number().integer().positive().required()
});

exports.createInvestmentSchema = Joi.object({
  reqId: Joi.number().integer().required(),
  investerName: Joi.string().min(2).required(),
  nic: Joi.string().min(10).required(),
  nicFront: Joi.string().uri().allow(null, ''),
  nicBack: Joi.string().uri().allow(null, ''),
  shares: Joi.number().integer().min(1).required(),
  totInvt: Joi.number().min(0).required(),
  expextreturnInvt: Joi.number().min(0).required(),
  internalRate: Joi.number().min(0).required(),
  bankSlip: Joi.string().uri().allow(null, ''),
});