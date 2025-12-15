const Joi = require("joi");

exports.deleteMarketPriceSchema = Joi.object({
  id: Joi.number().integer().required(),
});

exports.loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^0\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in format 07xxxxxxxxx',
      'any.required': 'Phone number is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    })
});

exports.registerSchema = Joi.object({
  title: Joi.string().required(),
  userName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  nic: Joi.string().required(),
  email: Joi.string().email().required(),
  address: Joi.string().required(),
  password: Joi.string().required(),
  confirmPassword: Joi.string().required()
});