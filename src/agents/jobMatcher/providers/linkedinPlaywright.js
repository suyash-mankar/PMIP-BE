const { JobProvider } = require('./types');

/**
 * LinkedIn Playwright-based Job Provider
 * Uses headless Chromium browser to search LinkedIn jobs
 * Much more reliable than Puppeteer and harder to detect
 * 
 * WARNING: 
 * - Requires Playwright and Chromium to be installed
 * - Uses more resources than HTTP-only approach
 * - Still violates LinkedIn ToS - use at your own risk
 */
class LinkedInPlaywrightProvider extends JobProvider {
  constructor(options = {}) {
    super();
    this.name = 'linkedin_playwright';
    
    // Configuration
    this.liAtCookie = options.liAtCookie || null;
    this.enabled = options.enabled !== false;
    this.baseUrl = 'https://www.linkedin.com';
    
    // Playwright instances (lazy loaded)
    this.browser = null;
    this.page = null;
    this.context = null;
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 3000; // 3 seconds between searches
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.blocked = false;
    
    // Stats
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      blocked: 0,
      lastError: null,
    };
  }

  /**
   * Initialize Playwright browser (lazy loading)
   * @private
   */
  async _initBrowser() {
    if (this.browser) {
      return; // Already initialized
    }

    try {
      const { chromium } = require('playwright');
      
      console.log('[LinkedInPlaywrightProvider] Launching browser...');
      
      // Launch browser with realistic settings
      this.browser = await chromium.launch({
        headless: true, // Use headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      // Create browser context with realistic settings
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        // Hide automation indicators
        javaScriptEnabled: true,
        acceptDownloads: false,
        hasTouch: false,
        isMobile: false,
        colorScheme: 'light',
      });

      // Create a new page
      this.page = await this.context.newPage();

      // Additional stealth measures
      await this.page.addInitScript(() => {
        // Override webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // Add Chrome property
        window.chrome = {
          runtime: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);

        // Override permissions API
        if (navigator.permissions) {
          const originalQuery = navigator.permissions.query;
          navigator.permissions.query = (parameters) =>
            originalQuery(parameters).catch(() => ({ state: 'denied' }));
        }
      });

      console.log('[LinkedInPlaywrightProvider] Browser initialized');
    } catch (error) {
      console.error('[LinkedInPlaywrightProvider] Failed to initialize browser:', error.message);
      throw new Error(`Playwright not available: ${error.message}`);
    }
  }

  /**
   * Close browser (cleanup)
   * @private
   */
  async _closeBrowser() {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.page = null;
      console.log('[LinkedInPlaywrightProvider] Browser closed');
    } catch (error) {
      console.error('[LinkedInPlaywrightProvider] Error closing browser:', error.message);
    }
  }

  /**
   * Set cookies and navigate to LinkedIn
   * @private
   */
  async _authenticate() {
    if (!this.liAtCookie) {
      throw new Error('No li_at cookie provided');
    }

    try {
      // Set cookies before navigating
      await this.context.addCookies([
        {
          name: 'li_at',
          value: this.liAtCookie,
          domain: '.linkedin.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None',
        },
      ]);

      // Navigate to LinkedIn homepage
      console.log('[LinkedInPlaywrightProvider] Authenticating...');
      await this.page.goto(`${this.baseUrl}/`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait a bit for page to fully load
      await this.page.waitForTimeout(2000 + Math.random() * 1000);

      // Check if we're logged in (look for feed or profile elements)
      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('nav') !== null || 
               document.querySelector('[data-test-global-nav]') !== null ||
               document.querySelector('main') !== null;
      });

      if (!isLoggedIn) {
        throw new Error('Cookie authentication failed - not logged in');
      }

      console.log('[LinkedInPlaywrightProvider] Authentication successful');
    } catch (error) {
      console.error('[LinkedInPlaywrightProvider] Authentication error:', error.message);
      throw error;
    }
  }

  /**
   * Search for jobs on LinkedIn
   */
  async search(query, limit = 10) {
    // Pre-flight checks
    if (!this.enabled) {
      console.log('[LinkedInPlaywrightProvider] Provider is disabled');
      return [];
    }

    if (this.blocked) {
      console.warn('[LinkedInPlaywrightProvider] Provider is blocked due to failures');
      return [];
    }

    if (!this.liAtCookie) {
      console.warn('[LinkedInPlaywrightProvider] No li_at cookie provided');
      return [];
    }

    // Rate limiting
    await this._waitForRateLimit();

    console.log(`[LinkedInPlaywrightProvider] Searching: "${query.keywords}" in ${query.location || 'India'}`);

    try {
      this.stats.requests++;

      // Initialize browser if needed
      await this._initBrowser();

      // Authenticate if not already done (or if page was closed)
      if (!this.page || !this.page.url().includes('linkedin.com')) {
        await this._authenticate();
      }

      // Build search URL
      const searchUrl = this._buildSearchUrl(query);
      
      // Navigate to job search page
      console.log('[LinkedInPlaywrightProvider] Navigating to job search...');
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for job listings to load
      await this.page.waitForTimeout(2000 + Math.random() * 2000);

      // Scroll to load more jobs (LinkedIn lazy loads)
      await this._scrollPage();

      // Wait a bit more for dynamic content
      await this.page.waitForTimeout(1000);

      // Extract job listings
      const jobs = await this._extractJobListings(limit);

      // Normalize to JobItem format
      const normalized = jobs.map(job => this._normalizeJob(job));

      // Success
      this.consecutiveFailures = 0;
      this.stats.successes++;

      console.log(`[LinkedInPlaywrightProvider] Found ${normalized.length} jobs`);
      return normalized;

    } catch (error) {
      this.stats.failures++;
      this.stats.lastError = error.message;
      this.consecutiveFailures++;

      // Check for CAPTCHA or blocks
      if (error.message.includes('CAPTCHA') || 
          error.message.includes('challenge') ||
          error.message.includes('blocked')) {
        this.blocked = true;
        this.stats.blocked++;
        console.error(`[LinkedInPlaywrightProvider] BLOCKED after ${this.consecutiveFailures} failures`);
      } else if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.blocked = true;
        this.stats.blocked++;
        console.error(`[LinkedInPlaywrightProvider] BLOCKED after ${this.consecutiveFailures} failures`);
      }

      console.error(`[LinkedInPlaywrightProvider] Error:`, error.message);

      // Don't close browser on error - keep it for next request
      
      return [];
    }
  }

  /**
   * Test LinkedIn cookie validity
   */
  async test() {
    if (!this.liAtCookie) {
      return {
        available: false,
        message: 'No li_at cookie provided',
      };
    }

    try {
      // Check if Playwright is available
      try {
        require('playwright');
      } catch (err) {
        return {
          available: false,
          message: 'Playwright not installed. Run: npm install playwright && npx playwright install chromium',
        };
      }

      // Initialize browser
      try {
        await this._initBrowser();
      } catch (initError) {
        if (initError.message.includes('not installed') || initError.message.includes('browser')) {
          return {
            available: false,
            message: 'Playwright Chromium not installed. Run: npx playwright install chromium',
          };
        }
        throw initError;
      }

      // Authenticate
      await this._authenticate();

      // Check if we can access feed
      await this.page.goto(`${this.baseUrl}/feed/`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });

      // Wait a moment for content to load
      await this.page.waitForTimeout(1000);

      // Check for CAPTCHA or blocks
      const hasChallenge = await this.page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('captcha') ||
               bodyText.includes('security challenge') ||
               bodyText.includes('unusual activity') ||
               bodyText.includes('verify your account');
      });

      if (hasChallenge) {
        await this._closeBrowser();
        return {
          available: false,
          message: 'Cookie triggered security challenge',
        };
      }

      await this._closeBrowser();

      return {
        available: true,
        message: 'Cookie is valid and browser access works',
      };
    } catch (error) {
      await this._closeBrowser().catch(() => {});
      
      if (error.message.includes('not logged in') || error.message.includes('authentication')) {
        return {
          available: false,
          message: 'Cookie is invalid or expired',
        };
      }

      if (error.message.includes('not installed') || error.message.includes('browser')) {
        return {
          available: false,
          message: 'Playwright Chromium not installed. Run: npx playwright install chromium',
        };
      }

      return {
        available: false,
        message: `Test failed: ${error.message}`,
      };
    }
  }

  /**
   * Get provider status
   */
  async getStatus() {
    let playwrightAvailable = false;
    let chromiumInstalled = false;
    
    try {
      require('playwright');
      playwrightAvailable = true;
      
      // Try to check if Chromium is installed
      const { chromium } = require('playwright');
      try {
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        chromiumInstalled = true;
      } catch (e) {
        // Chromium not installed
      }
    } catch (err) {
      // Playwright not installed
    }

    return {
      healthy: !this.blocked && !!this.liAtCookie && playwrightAvailable && chromiumInstalled,
      message: !playwrightAvailable
        ? 'Playwright not installed'
        : !chromiumInstalled
        ? 'Chromium not installed (run: npx playwright install chromium)'
        : this.blocked
        ? 'Provider blocked due to failures'
        : !this.liAtCookie
        ? 'No cookie configured'
        : 'Ready',
      stats: this.stats,
      blocked: this.blocked,
      playwrightAvailable,
      chromiumInstalled,
    };
  }

  /**
   * Reset blocked state
   */
  reset() {
    this.blocked = false;
    this.consecutiveFailures = 0;
    console.log('[LinkedInPlaywrightProvider] Reset - unblocked');
  }

  /**
   * Cleanup - close browser
   */
  async cleanup() {
    await this._closeBrowser();
  }

  /**
   * Build LinkedIn job search URL
   * @private
   */
  _buildSearchUrl(query) {
    const params = new URLSearchParams();
    
    params.append('keywords', query.keywords);
    
    if (query.location) {
      params.append('location', query.location);
    }
    
    if (query.datePosted) {
      const dateMap = {
        'today': 'r86400',
        'week': 'r604800',
        'month': 'r2592000',
      };
      if (dateMap[query.datePosted]) {
        params.append('f_TPR', dateMap[query.datePosted]);
      }
    }
    
    if (query.remote) {
      params.append('f_WT', '2');
    }
    
    return `${this.baseUrl}/jobs/search/?${params.toString()}`;
  }

  /**
   * Scroll page to load lazy-loaded content
   * @private
   */
  async _scrollPage() {
    try {
      // Scroll down gradually (like a human)
      await this.page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight || totalHeight >= 2000) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
    } catch (error) {
      console.warn('[LinkedInPlaywrightProvider] Scroll failed:', error.message);
    }
  }

  /**
   * Extract job listings from page
   * @private
   */
  async _extractJobListings(limit) {
    try {
      const jobs = await this.page.evaluate((maxLimit) => {
        const jobCards = [];
        
        // Try multiple selectors for job cards
        const selectors = [
          'ul.jobs-search__results-list > li',
          '.scaffold-layout__list-container > li',
          '.jobs-search-results-list > li',
          '[data-test-job-card]',
          'li.job-card-container',
        ];

        let cards = [];
        for (const selector of selectors) {
          cards = Array.from(document.querySelectorAll(selector));
          if (cards.length > 0) break;
        }

        cards.slice(0, maxLimit).forEach((card) => {
          try {
            // Extract job title
            const titleElem = card.querySelector('.job-card-list__title, .job-card__title, h3, [data-test-job-title], a[href*="/jobs/view/"] span');
            const title = titleElem ? titleElem.innerText.trim() : '';

            // Extract company name
            const companyElem = card.querySelector(
              '.job-card-container__company-name, .job-card__subtitle, .artdeco-entity-lockup__subtitle, [data-test-job-company], .job-card-container__primary-description'
            );
            const company = companyElem ? companyElem.innerText.trim() : '';

            // Extract location
            const locationElem = card.querySelector(
              '.job-card-container__metadata-item, .job-card__location, [data-test-job-location], .job-card-container__metadata-wrapper'
            );
            const location = locationElem ? locationElem.innerText.trim() : '';

            // Extract job URL
            const linkElem = card.querySelector('a[href*="/jobs/view/"]');
            const jobUrl = linkElem ? linkElem.getAttribute('href') : '';
            const jobId = jobUrl ? jobUrl.match(/\/jobs\/view\/(\d+)/)?.[1] : null;

            if (title && company && jobUrl) {
              jobCards.push({
                title,
                company,
                location,
                jobId,
                jobUrl: jobUrl.startsWith('http') ? jobUrl : `https://www.linkedin.com${jobUrl}`,
              });
            }
          } catch (err) {
            // Skip malformed cards
          }
        });

        return jobCards;
      }, limit);

      return jobs;
    } catch (error) {
      console.error('[LinkedInPlaywrightProvider] Failed to extract jobs:', error.message);
      return [];
    }
  }

  /**
   * Normalize job to JobItem
   * @private
   */
  _normalizeJob(job) {
    return {
      source: 'linkedin_playwright',
      sourceId: job.jobId,
      title: job.title,
      company: job.company,
      location: job.location || undefined,
      applyUrl: job.jobUrl,
      descriptionSnippet: undefined,
      skills: [],
      postedAt: undefined,
      employmentType: undefined,
      seniority: undefined,
      salary: undefined,
      logo: undefined,
    };
  }

  /**
   * Rate limiting
   * @private
   */
  async _waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    const baseDelay = 3000 + Math.random() * 2000; // 3-5 seconds
    
    if (elapsed < baseDelay) {
      const wait = baseDelay - elapsed;
      const jitter = Math.random() * 1000;
      const totalWait = wait + jitter;
      
      console.log(`[LinkedInPlaywrightProvider] Rate limit: waiting ${(totalWait / 1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, totalWait));
    } else {
      const microDelay = 200 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, microDelay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

module.exports = { LinkedInPlaywrightProvider };

