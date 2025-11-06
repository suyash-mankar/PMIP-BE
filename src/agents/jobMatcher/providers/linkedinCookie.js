const axios = require('axios');
const cheerio = require('cheerio');
const { JobProvider } = require('./types');

/**
 * LinkedIn Cookie-based Job Provider
 * Uses li_at session cookie to search LinkedIn jobs (NO BROWSER)
 * 
 * WARNING: 
 * - This uses the li_at cookie which is sensitive
 * - Violating LinkedIn ToS may result in account restrictions
 * - Use conservatively with rate limiting
 * - Behind feature flag, disabled by default
 */
class LinkedInCookieProvider extends JobProvider {
  constructor(options = {}) {
    super();
    this.name = 'linkedin_cookie';
    
    // Configuration
    this.liAtCookie = options.liAtCookie || null;
    this.enabled = options.enabled !== false; // Default true if cookie provided
    this.baseUrl = 'https://www.linkedin.com';
    
    // Rate limiting state
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // Increased to 2 seconds between requests
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    this.blocked = false;
    this._sessionWarmedUp = false;
    
    // User agent pool for rotation (optional, but helps)
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    ];
    this.currentUserAgent = this.userAgents[0];
    
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
   * Search for jobs on LinkedIn
   * @param {Object} query - JobSearchQuery
   * @param {number} limit - Max results
   * @returns {Promise<JobItem[]>}
   */
  async search(query, limit = 10) {
    // Pre-flight checks
    if (!this.enabled) {
      console.log('[LinkedInCookieProvider] Provider is disabled');
      return [];
    }

    if (this.blocked) {
      console.warn('[LinkedInCookieProvider] Provider is blocked due to failures');
      return [];
    }

    if (!this.liAtCookie) {
      console.warn('[LinkedInCookieProvider] No li_at cookie provided');
      return [];
    }

    // Rate limiting
    await this._waitForRateLimit();

    console.log(`[LinkedInCookieProvider] Searching: "${query.keywords}" in ${query.location || 'India'}`);

    try {
      this.stats.requests++;
      
      // Build search URL
      const searchUrl = this._buildSearchUrl(query);
      
      // Use referer chain: jobs page -> specific search
      const referer = `${this.baseUrl}/jobs/`;
      
      // Fetch with realistic headers and referer
      const html = await this._fetchPage(searchUrl, referer);
      
      // Parse jobs from HTML
      const jobs = this._parseJobListings(html, limit);
      
      // Normalize to JobItem format
      const normalized = jobs.map(job => this._normalizeJob(job));
      
      // Success
      this.consecutiveFailures = 0;
      this.stats.successes++;
      
      console.log(`[LinkedInCookieProvider] Found ${normalized.length} jobs`);
      return normalized;
      
    } catch (error) {
      this.stats.failures++;
      this.stats.lastError = error.message;
      this.consecutiveFailures++;
      
      // Block provider if too many failures
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.blocked = true;
        this.stats.blocked++;
        console.error(`[LinkedInCookieProvider] BLOCKED after ${this.consecutiveFailures} failures`);
      }
      
      console.error(`[LinkedInCookieProvider] Error:`, error.message);
      
      // Don't throw - return empty array to allow other providers to work
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
      // First warmup session for more realistic test
      if (!this._sessionWarmedUp) {
        try {
          await this._warmupSession();
        } catch (err) {
          // Continue with test even if warmup fails
        }
      }

      // Try to fetch the feed page (lightweight check)
      const response = await axios.get(`${this.baseUrl}/feed/`, {
        headers: this._getHeaders(`${this.baseUrl}/feed/`, `${this.baseUrl}/`),
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
        timeout: 20000,
      });

      // Check for redirects or auth issues
      if (response.status === 302 || response.status === 301) {
        const location = response.headers.location || '';
        if (location.includes('authwall') || location.includes('login') || location.includes('challenge')) {
          return {
            available: false,
            message: 'Cookie is invalid, expired, or challenged',
          };
        }
      }

      // Check response body for issues
      const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const lowerBody = body.toLowerCase();
      
      if (lowerBody.includes('captcha') || 
          lowerBody.includes('security-challenge') ||
          lowerBody.includes('challenge') ||
          lowerBody.includes('unusual activity')) {
        return {
          available: false,
          message: 'Cookie triggered security challenge',
        };
      }

      return {
        available: true,
        message: 'Cookie is valid',
      };
    } catch (error) {
      // Likely a redirect to login or auth issue
      if (error.response?.status === 302 || error.response?.status === 301) {
        return {
          available: false,
          message: 'Cookie is invalid or expired',
        };
      }

      // Check if it's a CAPTCHA/challenge error
      if (error.message.includes('CAPTCHA') || error.message.includes('challenge')) {
        return {
          available: false,
          message: 'Cookie triggered security challenge',
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
    return {
      healthy: !this.blocked && !!this.liAtCookie,
      message: this.blocked 
        ? 'Provider blocked due to failures'
        : !this.liAtCookie 
        ? 'No cookie configured'
        : 'Ready',
      stats: this.stats,
      blocked: this.blocked,
    };
  }

  /**
   * Reset blocked state (manual recovery)
   */
  reset() {
    this.blocked = false;
    this.consecutiveFailures = 0;
    console.log('[LinkedInCookieProvider] Reset - unblocked');
  }

  /**
   * Build LinkedIn job search URL
   * @private
   */
  _buildSearchUrl(query) {
    const params = new URLSearchParams();
    
    // Keywords (role + skills)
    params.append('keywords', query.keywords);
    
    // Location
    if (query.location) {
      params.append('location', query.location);
    }
    
    // Date posted filter
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
    
    // Remote filter
    if (query.remote) {
      params.append('f_WT', '2'); // Remote jobs
    }
    
    return `${this.baseUrl}/jobs/search/?${params.toString()}`;
  }

  /**
   * Fetch page with realistic headers and cookie
   * @private
   */
  async _fetchPage(url, referer = null) {
    // First, try to visit the main page to establish session (warmup)
    if (!this._sessionWarmedUp) {
      try {
        await this._warmupSession();
      } catch (err) {
        console.warn('[LinkedInCookieProvider] Session warmup failed, continuing anyway:', err.message);
      }
    }

    const response = await axios.get(url, {
      headers: this._getHeaders(url, referer),
      timeout: 30000, // Increased timeout
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept 4xx but not 5xx
      withCredentials: true,
    });

    // Check for redirects (often indicates auth issues)
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.location || '';
      if (location.includes('authwall') || location.includes('challenge') || location.includes('login')) {
        throw new Error('LinkedIn authentication required or challenged');
      }
    }

    // Check response body for various block indicators
    const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const lowerBody = body.toLowerCase();
    
    if (lowerBody.includes('captcha') || 
        lowerBody.includes('security-challenge') ||
        lowerBody.includes('challenge') ||
        lowerBody.includes('unusual activity') ||
        lowerBody.includes('verify your account') ||
        lowerBody.includes('security check') ||
        response.status === 429) {
      throw new Error('LinkedIn CAPTCHA or security challenge detected');
    }

    // Check for rate limiting
    if (response.status === 429) {
      throw new Error('LinkedIn rate limit exceeded');
    }

    return response.data;
  }

  /**
   * Warmup session by visiting main LinkedIn page first
   * This makes subsequent requests look more natural
   * @private
   */
  async _warmupSession() {
    console.log('[LinkedInCookieProvider] Warming up session...');
    
    try {
      // Visit the main LinkedIn page first (like a user opening the site)
      await axios.get(`${this.baseUrl}/`, {
        headers: this._getHeaders(`${this.baseUrl}/`),
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      // Human-like delay (2-4 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      
      // Visit feed page (like a user browsing)
      await axios.get(`${this.baseUrl}/feed/`, {
        headers: this._getHeaders(`${this.baseUrl}/feed/`, `${this.baseUrl}/`),
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      // Another delay
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
      
      // Visit jobs page (natural progression to job search)
      await axios.get(`${this.baseUrl}/jobs/`, {
        headers: this._getHeaders(`${this.baseUrl}/jobs/`, `${this.baseUrl}/feed/`),
        timeout: 20000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      this._sessionWarmedUp = true;
      console.log('[LinkedInCookieProvider] Session warmed up');
    } catch (error) {
      // Continue anyway, warmup is optional
      this._sessionWarmedUp = true; // Mark as attempted
      console.warn('[LinkedInCookieProvider] Warmup had issues, but continuing:', error.message);
    }
  }

  /**
   * Get realistic request headers that mimic a real browser
   * @private
   */
  _getHeaders(url = null, referer = null) {
    const headers = {
      'Cookie': `li_at=${this.liAtCookie}`,
      'User-Agent': this.currentUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': referer ? 'same-origin' : 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    };

    // Add Referer if provided (makes requests look more natural)
    if (referer) {
      headers['Referer'] = referer;
    } else if (url) {
      // If no referer provided, use base URL as referer for first request
      headers['Referer'] = this.baseUrl + '/';
    }

    // Add Origin header for same-origin requests
    if (url && url.startsWith(this.baseUrl)) {
      headers['Origin'] = this.baseUrl;
    }

    return headers;
  }

  /**
   * Parse job listings from HTML
   * @private
   */
  _parseJobListings(html, limit) {
    const $ = cheerio.load(html);
    const jobs = [];

    // LinkedIn job cards - selector may need adjustment based on page structure
    // Common selectors: .jobs-search__results-list li, .job-card-container, etc.
    const jobCards = $('.jobs-search__results-list li, .scaffold-layout__list-container li, .job-card-container').slice(0, limit);

    jobCards.each((i, elem) => {
      try {
        const $card = $(elem);
        
        // Extract job data (selectors may need refinement)
        const title = $card.find('.job-card-list__title, .job-card__title, h3').first().text().trim();
        const company = $card.find('.job-card-container__company-name, .job-card__subtitle, .artdeco-entity-lockup__subtitle').first().text().trim();
        const location = $card.find('.job-card-container__metadata-item, .job-card__location').first().text().trim();
        const linkElem = $card.find('a[href*="/jobs/view/"]').first();
        const jobUrl = linkElem.attr('href');
        const jobId = jobUrl ? jobUrl.match(/\/jobs\/view\/(\d+)/)?.[1] : null;
        
        if (title && company && jobUrl) {
          jobs.push({
            title,
            company,
            location,
            jobId,
            jobUrl: jobUrl.startsWith('http') ? jobUrl : `${this.baseUrl}${jobUrl}`,
          });
        }
      } catch (err) {
        // Skip malformed cards
        console.warn('[LinkedInCookieProvider] Failed to parse job card:', err.message);
      }
    });

    return jobs;
  }

  /**
   * Normalize parsed job to JobItem
   * @private
   */
  _normalizeJob(job) {
    return {
      source: 'linkedin_cookie',
      sourceId: job.jobId,
      title: job.title,
      company: job.company,
      location: job.location || undefined,
      applyUrl: job.jobUrl,
      descriptionSnippet: undefined, // Would need additional request to fetch
      skills: [],
      postedAt: undefined,
      employmentType: undefined,
      seniority: undefined,
      salary: undefined,
      logo: undefined,
    };
  }

  /**
   * Rate limiting with human-like jitter and delays
   * @private
   */
  async _waitForRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    // Base delay: 2-4 seconds (more human-like)
    const baseDelay = 2000 + Math.random() * 2000; // 2-4 seconds
    
    if (elapsed < baseDelay) {
      const wait = baseDelay - elapsed;
      // Add additional jitter (0-1 second)
      const jitter = Math.random() * 1000;
      const totalWait = wait + jitter;
      
      console.log(`[LinkedInCookieProvider] Rate limit: waiting ${(totalWait / 1000).toFixed(1)}s`);
      await new Promise(resolve => setTimeout(resolve, totalWait));
    } else {
      // If enough time has passed, still add a small random delay (100-500ms)
      // to make it look more human (humans don't click instantly)
      const microDelay = 100 + Math.random() * 400;
      await new Promise(resolve => setTimeout(resolve, microDelay));
    }
    
    this.lastRequestTime = Date.now();
  }
}

module.exports = { LinkedInCookieProvider };

