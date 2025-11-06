const { prisma } = require('../config/database');
const { encrypt, decrypt } = require('../config/security/crypto');
const { LinkedInCookieProvider } = require('../agents/jobMatcher/providers/linkedinCookie');
const { LinkedInPlaywrightProvider } = require('../agents/jobMatcher/providers/linkedinPlaywright');

/**
 * Get LinkedIn integration status for current user
 * GET /api/integrations/linkedin
 */
async function getLinkedInStatus(req, res) {
  try {
    const userId = req.user.id;

    const secret = await prisma.userSecret.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'linkedin_li_at',
        },
      },
      select: {
        status: true,
        lastTestedAt: true,
        updatedAt: true,
      },
    });

    if (!secret) {
      return res.json({
        configured: false,
        status: 'not_set',
        message: 'LinkedIn cookie not configured',
      });
    }

    return res.json({
      configured: true,
      status: secret.status,
      lastTestedAt: secret.lastTestedAt,
      updatedAt: secret.updatedAt,
    });
  } catch (error) {
    console.error('[IntegrationsController] Get LinkedIn status error:', error);
    res.status(500).json({ 
      error: 'Failed to get LinkedIn status',
      message: error.message,
    });
  }
}

/**
 * Save LinkedIn li_at cookie (encrypted)
 * POST /api/integrations/linkedin
 * Body: { liAtCookie: string }
 */
async function saveLinkedInCookie(req, res) {
  try {
    const userId = req.user.id;
    const { liAtCookie } = req.body;

    // Validation
    if (!liAtCookie || typeof liAtCookie !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'liAtCookie is required and must be a string',
      });
    }

    // Basic validation - li_at cookies are typically long alphanumeric strings
    if (liAtCookie.length < 20) {
      return res.status(400).json({ 
        error: 'Invalid cookie',
        message: 'li_at cookie appears to be invalid (too short)',
      });
    }

    // Encrypt the cookie
    const encrypted = encrypt(liAtCookie);

    // Save to database (upsert)
    await prisma.userSecret.upsert({
      where: {
        userId_key: {
          userId,
          key: 'linkedin_li_at',
        },
      },
      create: {
        userId,
        key: 'linkedin_li_at',
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        authTag: encrypted.authTag,
        status: 'active',
      },
      update: {
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        authTag: encrypted.authTag,
        status: 'active',
        lastTestedAt: null, // Reset test status on update
      },
    });

    console.log(`[IntegrationsController] LinkedIn cookie saved for user ${userId}`);

    res.json({
      success: true,
      message: 'LinkedIn cookie saved successfully',
      status: 'active',
    });
  } catch (error) {
    console.error('[IntegrationsController] Save LinkedIn cookie error:', error);
    res.status(500).json({ 
      error: 'Failed to save LinkedIn cookie',
      message: error.message,
    });
  }
}

/**
 * Test LinkedIn cookie validity
 * POST /api/integrations/linkedin/test
 */
async function testLinkedInCookie(req, res) {
  try {
    const userId = req.user.id;

    // Fetch encrypted cookie
    const secret = await prisma.userSecret.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'linkedin_li_at',
        },
      },
    });

    if (!secret) {
      return res.status(404).json({
        error: 'Not found',
        message: 'LinkedIn cookie not configured',
      });
    }

    // Decrypt cookie
    const liAtCookie = decrypt({
      ciphertext: secret.ciphertext,
      nonce: secret.nonce,
      authTag: secret.authTag,
    });

    // Try Playwright first (headless browser - much better), fall back to HTTP-only
    let provider = null;
    let testResult = null;
    let usedPlaywright = false;

    try {
      // Check if Playwright is available
      require('playwright');
      provider = new LinkedInPlaywrightProvider({ liAtCookie });
      usedPlaywright = true;
      console.log('[IntegrationsController] Testing with Playwright (headless browser)');
      testResult = await provider.test();
      
      // If Playwright test failed due to Chromium issues, fall back to HTTP
      if (!testResult.available && 
          (testResult.message.includes('Chromium') || 
           testResult.message.includes('not installed') ||
           testResult.message.includes('browser'))) {
        console.log('[IntegrationsController] Playwright Chromium issue detected, falling back to HTTP-only');
        usedPlaywright = false;
        provider = new LinkedInCookieProvider({ liAtCookie });
        testResult = await provider.test();
      }
      
      // Cleanup Playwright browser if it was used
      if (usedPlaywright && typeof provider.cleanup === 'function') {
        await provider.cleanup().catch(() => {});
      }
    } catch (playwrightError) {
      // Playwright not available or threw unexpected error, use HTTP-only
      console.log('[IntegrationsController] Playwright error, falling back to HTTP-only provider:', playwrightError.message);
      usedPlaywright = false;
      provider = new LinkedInCookieProvider({ liAtCookie });
      testResult = await provider.test();
    }

    // Update status
    const newStatus = testResult.available ? 'active' : 'invalid';
    await prisma.userSecret.update({
      where: {
        userId_key: {
          userId,
          key: 'linkedin_li_at',
        },
      },
      data: {
        status: newStatus,
        lastTestedAt: new Date(),
      },
    });

    const method = usedPlaywright ? 'Playwright' : 'HTTP';
    console.log(`[IntegrationsController] LinkedIn cookie test (${method}) for user ${userId}: ${testResult.available ? 'PASS' : 'FAIL'}`);

    res.json({
      success: true,
      available: testResult.available,
      status: newStatus,
      message: testResult.message + (usedPlaywright ? ' (using headless browser)' : ' (using HTTP)'),
      method: usedPlaywright ? 'playwright' : 'http',
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[IntegrationsController] Test LinkedIn cookie error:', error);
    res.status(500).json({ 
      error: 'Failed to test LinkedIn cookie',
      message: error.message,
    });
  }
}

/**
 * Remove LinkedIn cookie
 * DELETE /api/integrations/linkedin
 */
async function removeLinkedInCookie(req, res) {
  try {
    const userId = req.user.id;

    const deleted = await prisma.userSecret.deleteMany({
      where: {
        userId,
        key: 'linkedin_li_at',
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'LinkedIn cookie not configured',
      });
    }

    console.log(`[IntegrationsController] LinkedIn cookie removed for user ${userId}`);

    res.json({
      success: true,
      message: 'LinkedIn cookie removed successfully',
    });
  } catch (error) {
    console.error('[IntegrationsController] Remove LinkedIn cookie error:', error);
    res.status(500).json({ 
      error: 'Failed to remove LinkedIn cookie',
      message: error.message,
    });
  }
}

/**
 * Get decrypted LinkedIn cookie for internal use
 * @param {number} userId 
 * @returns {Promise<string|null>} Decrypted cookie or null
 */
async function getLinkedInCookieForUser(userId) {
  try {
    const secret = await prisma.userSecret.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'linkedin_li_at',
        },
      },
    });

    if (!secret || secret.status !== 'active') {
      return null;
    }

    const liAtCookie = decrypt({
      ciphertext: secret.ciphertext,
      nonce: secret.nonce,
      authTag: secret.authTag,
    });

    return liAtCookie;
  } catch (error) {
    console.error('[IntegrationsController] Get LinkedIn cookie error:', error);
    return null;
  }
}

module.exports = {
  getLinkedInStatus,
  saveLinkedInCookie,
  testLinkedInCookie,
  removeLinkedInCookie,
  getLinkedInCookieForUser, // For internal use
};

