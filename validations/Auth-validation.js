const Joi = require("joi");

exports.deleteMarketPriceSchema = Joi.object({
  id: Joi.number().integer().required(),
});