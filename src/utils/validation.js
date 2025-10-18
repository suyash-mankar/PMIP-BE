const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const startInterviewSchema = Joi.object({
  level: Joi.string().valid('junior', 'mid', 'senior').required(),
  category: Joi.string().optional().allow(null, ''),
});

const submitAnswerSchema = Joi.object({
  sessionId: Joi.number().integer().positive().optional(),
  questionId: Joi.number().integer().positive().required(),
  answerText: Joi.string().min(10).required(),
});

const scoreSchema = Joi.object({
  sessionId: Joi.number().integer().positive().required(),
});

const createCheckoutSchema = Joi.object({
  currency: Joi.string().valid('usd', 'inr').default('inr'),
});

const validate = schema => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message),
      });
    }
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  startInterviewSchema,
  submitAnswerSchema,
  scoreSchema,
  createCheckoutSchema,
};
