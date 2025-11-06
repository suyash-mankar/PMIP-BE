const { JobProvider } = require('./types');

/**
 * LinkedIn Puppeteer-based Job Provider
 * Uses headless Chrome browser to search LinkedIn jobs
 * Much harder to detect than HTTP-only scraping
 * 
 * WARNING: 
 * - Requires Puppeteer and Chromium to be installed
 * - Uses more resources than HTTP-only approach
 * - Still violates LinkedIn ToS - use at your own risk
 */
class LinkedInPuppeteerProvider extends JobProvider {
  constructor(options = {}) {
    super();
    this.name = 'linkedin_puppeteer';
    
    // Configuration
    this.liAtCookie = options.liAtCookie || null;
    this.enabled = options.enabled !== false;
    this.baseUrl = 'https://www.linkedin.com';
    
    // Puppeteer instance (lazy loaded)
    this.browser = null;
    this.page = null;
    
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
   * Initialize Puppeteer browser (lazy loading)
   * @private
   */
  async _initBrowser() {
    if (this.browser) {
      return; // Already initialized
    }

    try {
      const puppeteer = require('puppeteer');
      
      console.log('[LinkedInPuppeteerProvider] Launching browser...');
      
      // Try to launch with timeout and better error handling
      const launchOptions = {
        headless: 'new', // Use new headless mode (harder to detect)
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
        timeout: 60000, // 60 second timeout for browser launch
      };

      // Try to get executable path
      let executablePath;
      try {
        executablePath = puppeteer.executablePath();
        console.log('[LinkedInPuppeteerProvider] Using Chromium at:', executablePath);
      } catch (pathError) {
        console.warn('[LinkedInPuppeteerProvider] Could not get executable path, using default');
      }

      // Add executable path if available
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      // Try to launch browser
      try {
        this.browser = await puppeteer.launch(launchOptions);
      } catch (launchError) {
        // If launch fails with socket error, Chromium might be corrupted
        if (launchError.message.includes('socket') || launchError.message.includes('ECONNRESET')) {
          console.error('[LinkedInPuppeteerProvider] Browser launch failed - Chromium may be corrupted');
          console.error('[LinkedInPuppeteerProvider] Fix: rm -rf node_modules/puppeteer/.local-chromium && npm install puppeteer --force');
          throw new Error('Chromium launch failed. Try: rm -rf node_modules/puppeteer/.local-chromium && npm install puppeteer --force');
        }
        if (launchError.message.includes('timeout')) {
          throw new Error('Browser launch timeout. System may be slow or Chromium corrupted.');
        }
        throw launchError;
      }

      // Create a new page
      this.page = await this.browser.newPage();

      // Set realistic user agent and viewport
      await this.page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Hide automation indicators
      await this.page.evaluateOnNewDocument(() => {
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
      });

      console.log('[LinkedInPuppeteerProvider] Browser initialized');
    } catch (error) {
      console.error('[LinkedInPuppeteerProvider] Failed to initialize browser:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('socket') || error.message.includes('timeout')) {
        throw new Error('Puppeteer Chromium download incomplete or network issue. Try: npm install puppeteer --force');
      }
      
      throw new Error(`Puppeteer not available: ${error.message}`);
    }
  }

  /**
   * Close browser (cleanup)
   * @private
   */
  async _closeBrowser() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        console.log('[LinkedInPuppeteerProvider] Browser closed');
      } catch (error) {
        console.error('[LinkedInPuppeteerProvider] Error closing browser:', error.message);
      }
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
      await this.page.setCookie({
        name: 'li_at',
        value: this.liAtCookie,
        domain: '.linkedin.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'None',
      });

      // Navigate to LinkedIn homepage
      console.log('[LinkedInPuppeteerProvider] Authenticating...');
      await this.page.goto(`${this.baseUrl}/`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for page to fully load
      await this.page.waitForTimeout(2000 + Math.random() * 1000);

      // Check if we're logged in (look for feed or profile elements)
      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('nav') !== null || 
               document.querySelector('[data-test-global-nav]') !== null;
      });

      if (!isLoggedIn) {
        throw new Error('Cookie authentication failed - not logged in');
      }

      console.log('[LinkedInPuppeteerProvider] Authentication successful');
    } catch (error) {
      console.error('[LinkedInPuppeteerProvider] Authentication error:', error.message);
      throw error;
    }
  }

  /**
   * Search for jobs on LinkedIn
   */
  async search(query, limit = 10) {
    // Pre-flight checks
    if (!this.enabled) {
      console.log('[LinkedInPuppeteerProvider] Provider is disabled');
      return [];
    }

    if (this.blocked) {
      console.warn('[LinkedInPuppeteerProvider] Provider is blocked due to failures');
      return [];
    }

    if (!this.liAtCookie) {
      console.warn('[LinkedInPuppeteerProvider] No li_at cookie provided');
      return [];
    }

    // Rate limiting
    await this._waitForRateLimit();

    console.log(`[LinkedInPuppeteerProvider] Searching: "${query.keywords}" in ${query.location || 'India'}`);

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
      console.log('[LinkedInPuppeteerProvider] Navigating to job search...');
      await this.page.goto(searchUrl, {
        waitUntil: 'networkidle2',
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

      console.log(`[LinkedInPuppeteerProvider] Found ${normalized.length} jobs`);
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
        console.error(`[LinkedInPuppeteerProvider] BLOCKED after ${this.consecutiveFailures} failures`);
      } else if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.blocked = true;
        this.stats.blocked++;
        console.error(`[LinkedInPuppeteerProvider] BLOCKED after ${this.consecutiveFailures} failures`);
      }

      console.error(`[LinkedInPuppeteerProvider] Error:`, error.message);

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
      // Check if Puppeteer is available
      let puppeteer;
      try {
        puppeteer = require('puppeteer');
      } catch (err) {
        return {
          available: false,
          message: 'Puppeteer not installed. Run: npm install puppeteer',
        };
      }

      // Try to initialize browser with better error handling
      try {
        await this._initBrowser();
      } catch (initError) {
        // If initialization fails (e.g., Chromium not downloaded), return helpful error
        if (initError.message.includes('Chromium') || initError.message.includes('socket')) {
          return {
            available: false,
            message: 'Puppeteer Chromium not available. Run: npm install puppeteer --force',
          };
        }
        throw initError;
      }

      // Authenticate
      await this._authenticate();

      // Check if we can access feed
      await this.page.goto(`${this.baseUrl}/feed/`, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });

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

      if (error.message.includes('Chromium') || error.message.includes('socket')) {
        return {
          available: false,
          message: 'Puppeteer Chromium issue. The system will fallback to HTTP-only provider.',
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
    let puppeteerAvailable = false;
    try {
      require('puppeteer');
      puppeteerAvailable = true;
    } catch (err) {
      // Puppeteer not installed
    }

    return {
      healthy: !this.blocked && !!this.liAtCookie && puppeteerAvailable,
      message: !puppeteerAvailable
        ? 'Puppeteer not installed'
        : this.blocked
        ? 'Provider blocked due to failures'
        : !this.liAtCookie
        ? 'No cookie configured'
        : 'Ready',
      stats: this.stats,
      blocked: this.blocked,
      puppeteerAvailable,
    };
  }

  /**
   * Reset blocked state
   */
  reset() {
    this.blocked = false;
    this.consecutiveFailures = 0;
    console.log('[LinkedInPuppeteerProvider] Reset - unblocked');
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
      console.warn('[LinkedInPuppeteerProvider] Scroll failed:', error.message);
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
        ];

        let cards = [];
        for (const selector of selectors) {
          cards = Array.from(document.querySelectorAll(selector));
          if (cards.length > 0) break;
        }

        cards.slice(0, maxLimit).forEach((card) => {
          try {
            // Extract job title
            const titleElem = card.querySelector('.job-card-list__title, .job-card__title, h3, [data-test-job-title]');
            const title = titleElem ? titleElem.innerText.trim() : '';

            // Extract company name
            const companyElem = card.querySelector(
              '.job-card-container__company-name, .job-card__subtitle, .artdeco-entity-lockup__subtitle, [data-test-job-company]'
            );
            const company = companyElem ? companyElem.innerText.trim() : '';

            // Extract location
            const locationElem = card.querySelector(
              '.job-card-container__metadata-item, .job-card__location, [data-test-job-location]'
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
      console.error('[LinkedInPuppeteerProvider] Failed to extract jobs:', error.message);
      return [];
    }
  }

  /**
   * Normalize job to JobItem
   * @private
   */
  _normalizeJob(job) {
    return {
      source: 'linkedin_puppeteer',
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
      
      console.log(`[LinkedInPuppeteerProvider] Rate limit: waiting ${(totalWait / 1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, totalWait));
    } else {
      const microDelay = 200 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, microDelay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

module.exports = { LinkedInPuppeteerProvider };

