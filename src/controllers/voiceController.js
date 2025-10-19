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

module.exports = {
  transcribeAudio,
  upload,
};
