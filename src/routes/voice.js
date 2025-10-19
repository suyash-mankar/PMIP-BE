const express = require('express');
const { transcribeAudio, upload } = require('../controllers/voiceController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Transcribe audio to text using OpenAI Whisper
router.post('/transcribe', authMiddleware, upload.single('audio'), transcribeAudio);

module.exports = router;
