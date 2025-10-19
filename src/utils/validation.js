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
  category: Joi.string().optional().allow(null, ''),
});

const submitAnswerSchema = Joi.object({
  answerId: Joi.number().integer().positive().optional().allow(null),
  practiceSessionId: Joi.number().integer().positive().optional().allow(null),
  questionId: Joi.number().integer().positive().required(),
  answerText: Joi.string().min(10).required(),
  timeTaken: Joi.number().integer().min(0).optional().allow(null),
}).custom((value, helpers) => {
  // If answerId is not provided, practiceSessionId is required
  if (!value.answerId && !value.practiceSessionId) {
    return helpers.error('any.custom', {
      message: 'practiceSessionId is required when creating a new answer',
    });
  }
  return value;
});

const scoreSchema = Joi.object({
  answerId: Joi.number().integer().positive().required(),
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
