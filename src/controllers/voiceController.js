const openai = require('../config/openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

/**
 * Transcribe audio using OpenAI Whisper
 */
const transcribeAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioFile = req.file;
    console.log('🎤 Transcribing audio:', audioFile.originalname);

    // Rename file with proper extension if it doesn't have one
    const extension = path.extname(audioFile.originalname) || '.webm';
    const newPath = audioFile.path + extension;
    fs.renameSync(audioFile.path, newPath);

    // Call OpenAI Whisper API with the properly named file
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: 'whisper-1',
      language: 'en', // You can make this dynamic if needed
      response_format: 'json',
    });

    // Delete the uploaded file after transcription
    fs.unlinkSync(newPath);

    console.log('✅ Transcription successful:', transcription.text.substring(0, 50) + '...');

    res.json({
      text: transcription.text,
      language: transcription.language || 'en',
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      const extension = path.extname(req.file.originalname) || '.webm';
      const newPath = req.file.path + extension;

      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    console.error('❌ Transcription error:', error);
    next(error);
  }
};

/**
 * Generate speech from text using OpenAI TTS
 */
const textToSpeech = async (req, res, next) => {
  try {
    let { text, voice = 'nova' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // OpenAI TTS has a 4096 character limit
    const MAX_CHARS = 4096;

    // If text is too long, truncate it with an ellipsis
    if (text.length > MAX_CHARS) {
      console.log(`⚠️  Text too long (${text.length} chars), truncating to ${MAX_CHARS} chars`);
      // Try to truncate at a sentence boundary
      text = text.substring(0, MAX_CHARS - 50); // Leave room for ellipsis
      const lastPeriod = text.lastIndexOf('.');
      const lastQuestion = text.lastIndexOf('?');
      const lastExclamation = text.lastIndexOf('!');
      const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

      if (lastSentence > MAX_CHARS * 0.8) {
        // If we found a sentence ending in the last 20%, use it
        text = text.substring(0, lastSentence + 1);
      } else {
        // Otherwise just truncate and add ellipsis
        text = text + '...';
      }
    }

    console.log(
      `🔊 Generating speech for text (${text.length} chars):`,
      text.substring(0, 50) + '...'
    );

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // Use 'tts-1-hd' for higher quality (more expensive)
      voice: voice, // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      response_format: 'mp3',
      speed: 1.0, // 0.25 to 4.0
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log('✅ Speech generated successfully');

    // Set headers for audio streaming
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    });

    // Send audio buffer
    res.send(buffer);
  } catch (error) {
    console.error('❌ Text-to-speech error:', error);
    next(error);
  }
};

module.exports = {
  transcribeAudio,
  textToSpeech,
  upload,
};
