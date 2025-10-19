const express = require('express');
const { transcribeAudio, textToSpeech, upload } = require('../controllers/voiceController');
const { authMiddleware } = require('../middlewares/auth');

const router = express.Router();

// Transcribe audio to text using OpenAI Whisper
router.post('/transcribe', authMiddleware, upload.single('audio'), transcribeAudio);

// Convert text to speech using OpenAI TTS
router.post('/speak', authMiddleware, textToSpeech);

module.exports = router;
