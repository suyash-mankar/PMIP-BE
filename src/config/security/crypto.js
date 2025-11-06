const crypto = require('crypto');

/**
 * AES-GCM Encryption Utilities for Secure Secret Storage
 * 
 * Uses AES-256-GCM for authenticated encryption of sensitive data like
 * li_at cookies, API keys, etc.
 * 
 * Key management:
 * - Uses KMS_SECRET_KEY env var (32 bytes hex)
 * - Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} If KMS_SECRET_KEY is missing or invalid
 */
function getEncryptionKey() {
  const keyHex = process.env.KMS_SECRET_KEY;
  
  if (!keyHex) {
    throw new Error('KMS_SECRET_KEY environment variable is required for encryption');
  }
  
  const key = Buffer.from(keyHex, 'hex');
  
  if (key.length !== 32) {
    throw new Error('KMS_SECRET_KEY must be 32 bytes (64 hex characters)');
  }
  
  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param {string} plaintext - Data to encrypt
 * @returns {{ciphertext: string, nonce: string, authTag: string}} Encrypted data components (all hex)
 * @throws {Error} If encryption fails
 */
function encrypt(plaintext) {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext');
  }

  try {
    const key = getEncryptionKey();
    
    // Generate random IV (nonce)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return components as hex strings
    return {
      ciphertext: encrypted.toString('hex'),
      nonce: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('[Crypto] Encryption error:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param {{ciphertext: string, nonce: string, authTag: string}} encrypted - Encrypted data components (all hex)
 * @returns {string} Decrypted plaintext
 * @throws {Error} If decryption fails or authentication fails
 */
function decrypt(encrypted) {
  if (!encrypted || !encrypted.ciphertext || !encrypted.nonce || !encrypted.authTag) {
    throw new Error('Invalid encrypted data: missing required fields');
  }

  try {
    const key = getEncryptionKey();
    
    // Convert hex to buffers
    const ciphertext = Buffer.from(encrypted.ciphertext, 'hex');
    const iv = Buffer.from(encrypted.nonce, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set auth tag (must be done before update/final)
    decipher.setAuthTag(authTag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Crypto] Decryption error:', error.message);
    
    // Auth tag verification failure
    if (error.message.includes('Unsupported state') || error.message.includes('auth')) {
      throw new Error('Decryption failed: data has been tampered with or key is incorrect');
    }
    
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate a new random encryption key (for initial setup)
 * 
 * @returns {string} 32-byte key as hex string
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate encryption key format
 * 
 * @param {string} keyHex - Key to validate
 * @returns {{valid: boolean, message?: string}}
 */
function validateKey(keyHex) {
  if (!keyHex) {
    return { valid: false, message: 'Key is empty' };
  }
  
  if (typeof keyHex !== 'string') {
    return { valid: false, message: 'Key must be a string' };
  }
  
  if (!/^[0-9a-f]+$/i.test(keyHex)) {
    return { valid: false, message: 'Key must be hex encoded' };
  }
  
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    return { valid: false, message: 'Key must be exactly 32 bytes (64 hex characters)' };
  }
  
  return { valid: true };
}

module.exports = {
  encrypt,
  decrypt,
  generateKey,
  validateKey,
};

