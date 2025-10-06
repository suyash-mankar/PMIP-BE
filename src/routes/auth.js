const express = require('express');
const { register, login } = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../utils/validation');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

module.exports = router;
