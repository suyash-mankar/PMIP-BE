/**
 * Enhanced Product Folks scraper that fetches full Q&A with answers
 * Stores questions in DB and answers as exemplars with sourceUrl
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');
const { exemplarInsert } = require('../src/utils/vector');
const crypto = require('crypto');

const prisma = new PrismaClient();

const PRODUCTFOLKS_CATEGORIES = {
  RCA: 'RCA',
  'Root Cause Analysis': 'RCA',
  Metrics: 'Metrics',
  Guesstimates: 'Guesstimates',
  'Product Design': 'Product Design',
  'Product Improvement': 'Product Improvement',
  'Product Strategy': 'Product Strategy',
};

// Rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeProductFolksWithAnswers() {
  console.log('🕷️  Starting enhanced Product Folks scraping (with answers)...');
  console.log('📍 Source: https://www.theproductfolks.com/product-management-case-studies\n');

  try {
    const baseUrl = 'https://www.theproductfolks.com';
    
    // Step 1: Get all case study links from main page
    console.log('🔍 Step 1: Fetching case studies index...');
    const caseStudyLinks = await scrapeCaseStudyLinks(baseUrl);
    console.log(`✓ Found ${caseStudyLinks.length} case study links\n`);

    let questionsAdded = 0;
    let exemplarsAdded = 0;
    let errors = 0;

    // Step 2: Fetch each case study page and extract Q&A
    console.log('📖 Step 2: Fetching individual case studies...\n');
    
    for (let i = 0; i < caseStudyLinks.length; i++) {
      const link = caseStudyLinks[i];
      console.log(`[${i + 1}/${caseStudyLinks.length}] Processing: ${link.title}`);
      console.log(`    URL: ${link.url}`);

      try {
        // Normalize URL - handle both relative and absolute URLs
        let fullUrl = link.url;
        if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
          // Already a full URL, use as-is
        } else if (fullUrl.startsWith('/')) {
          // Relative URL, prepend base URL
          fullUrl = baseUrl + fullUrl;
        } else {
          // Relative URL without leading slash
          fullUrl = baseUrl + '/' + fullUrl;
        }

        // Fetch case study details
        const caseStudy = await scrapeCaseStudyPage(fullUrl);
        
        if (!caseStudy || !caseStudy.question || !caseStudy.answer) {
          console.log(`    ⚠️  Incomplete data, skipping...`);
          errors++;
          await delay(1000);
          continue;
        }

        // Check if question already exists
        const existing = await prisma.question.findFirst({
          where: { text: caseStudy.question.trim() },
        });

        let questionId;
        if (existing) {
          console.log(`    ℹ️  Question exists (ID: ${existing.id})`);
          questionId = existing.id;
      } else {
        // Add question to database
          const newQuestion = await prisma.question.create({
            data: {
              text: caseStudy.question.trim(),
              category: caseStudy.category,
              company: JSON.stringify([caseStudy.company]),
              tags: JSON.stringify([
                caseStudy.company.toLowerCase(),
                caseStudy.category.toLowerCase(),
                'theproductfolks',
              ]),
              source: 'theproductfolks',
            },
          });
          questionId = newQuestion.id;
          questionsAdded++;
          console.log(`    ✅ Question added (ID: ${questionId})`);
        }

        // Store answer as exemplar with sourceUrl
        const sourceHash = crypto
          .createHash('md5')
          .update(caseStudy.answer)
          .digest('hex');

        const exemplarId = await exemplarInsert({
              questionId,
              source: 'theproductfolks',
              author: 'The Product Folks',
          title: caseStudy.title || caseStudy.question.substring(0, 100),
          content: caseStudy.answer,
          keyPoints: caseStudy.keyPoints || null,
          qualityScore: 9, // curated human content
              version: 1,
          sourceUrl: fullUrl,
              sourceHash,
            });

        exemplarsAdded++;
        console.log(`    ✅ Exemplar stored (ID: ${exemplarId})`);
        console.log();

        // Rate limiting - be respectful
        await delay(2000);
      } catch (err) {
        console.error(`    ❌ Error processing case study: ${err.message}`);
        errors++;
        await delay(1000);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Scraping completed!');
    console.log(`📊 Questions added: ${questionsAdded}`);
    console.log(`📝 Exemplars added: ${exemplarsAdded}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function scrapeCaseStudyLinks(baseUrl) {
  const url = `${baseUrl}/product-management-case-studies`;
  const allLinks = [];
  
  try {
    // Try to get first page
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 10 pages to avoid infinite loops
      const pageUrl = page === 1 ? url : `${url}?page=${page}`;
      console.log(`  Fetching page ${page}...`);

      try {
        const response = await axios.get(pageUrl, {
      headers: {
        'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
          timeout: 10000,
    });

    const $ = cheerio.load(response.data);
        const pageLinks = [];

        // Multiple strategies to find case study links
        // Strategy 1: Look for "Read Case Study" links
        $('a').each((index, element) => {
      const $link = $(element);
          const text = $link.text().trim().toLowerCase();
      const href = $link.attr('href');

          // Filter: must be a case study link, not a category page
          if (
            href &&
            !href.includes('categories') && // Skip category pages
            !href.includes('#') && // Skip anchor links
            href !== '/product-management-case-studies' && // Skip main page
            (text.includes('read case study') ||
              text.includes('case study') ||
              text.includes('view case') ||
              (href.includes('case-stud') && !href.includes('categories')) ||
              (href.includes('case-study') && !href.includes('categories')))
          ) {
            // Extract title from nearby elements or card
            const $card = $link.closest('[class*="card"], [class*="item"], article, [class*="post"], [class*="case"]');
            let title =
              $card.find('h3, h4, h5, [class*="title"], [class*="heading"]').first().text().trim() ||
              $card.find('p, [class*="description"]').first().text().substring(0, 80).trim() ||
              $link.text().trim() ||
              'Case Study';

            // Clean up title
            title = title.replace(/Read Case Study|View Case|Case Study/gi, '').trim();

            let company =
              $card.find('[class*="company"], [class*="brand"], strong, b').first().text().trim() ||
              title.split('-')[0].trim() ||
              'Unknown';

            // Clean up company name
            company = company.replace(/^-\s*|\s*-$/g, '').trim();

            // Normalize URL - keep relative URLs for consistency
            let normalizedUrl = href;
            if (href.startsWith('http://') || href.startsWith('https://')) {
              // Extract path from full URL
              try {
                const urlObj = new URL(href);
                normalizedUrl = urlObj.pathname;
              } catch (e) {
                // If URL parsing fails, try to extract path manually
                const match = href.match(/https?:\/\/[^\/]+(\/.*)/);
                normalizedUrl = match ? match[1] : href;
              }
            } else if (!href.startsWith('/')) {
              normalizedUrl = '/' + href;
            }
            
            pageLinks.push({
              url: normalizedUrl,
              title: title || 'Case Study',
              company: company || 'Unknown',
            });
          }
        });

        // Strategy 2: Look for article/blog post links
        if (pageLinks.length === 0) {
          $('article a, [class*="post"] a, [class*="blog"] a').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href');
                if (href && 
                    !href.includes('categories') &&
                    !href.includes('#') &&
                    href !== '/product-management-case-studies' &&
                    (href.includes('case') || href.includes('study'))) {
              const title = $link.text().trim() || $link.closest('article').find('h2, h3').first().text().trim();
              if (title && title.length > 10) {
                // Normalize URL
                let normalizedUrl = href;
                if (href.startsWith('http://') || href.startsWith('https://')) {
                  try {
                    const urlObj = new URL(href);
                    normalizedUrl = urlObj.pathname;
                  } catch (e) {
                    const match = href.match(/https?:\/\/[^\/]+(\/.*)/);
                    normalizedUrl = match ? match[1] : href;
                  }
                } else if (!href.startsWith('/')) {
                  normalizedUrl = '/' + href;
                }
                
                pageLinks.push({
                  url: normalizedUrl,
                  title: title,
                  company: 'Unknown',
                });
              }
            }
          });
        }

        if (pageLinks.length === 0) {
          hasMore = false;
        } else {
          allLinks.push(...pageLinks);
          // Check if there's a next page
          const nextPageLink = $('a[class*="next"], a:contains("Next"), a:contains(">")').first();
          hasMore = nextPageLink.length > 0 && page < 10;
          page++;
        }

        await delay(1000); // Rate limiting
      } catch (pageError) {
        console.error(`  Error fetching page ${page}: ${pageError.message}`);
        hasMore = false;
      }
    }

    // Remove duplicates
    const uniqueLinks = [];
    const seenUrls = new Set();
    
    for (const link of allLinks) {
      // Normalize URL
      const normalizedUrl = link.url.split('?')[0].split('#')[0];
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueLinks.push({
          ...link,
          url: normalizedUrl,
        });
      }
    }

    console.log(`  ✓ Found ${uniqueLinks.length} unique case study links`);
    return uniqueLinks;
  } catch (error) {
    console.error('Error fetching case study links:', error.message);
    return [];
  }
}

async function scrapeCaseStudyPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // Extract category first (appears before company in some layouts)
    let categoryText = '';
    $('a[href*="product-management-case-studies-categories"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text && !categoryText) {
        categoryText = text;
        return false;
      }
    });
    
    if (!categoryText) {
      categoryText = $('[class*="category"], [class*="tag"], .badge, .label')
        .first()
        .text()
        .trim() || 'Product Strategy';
    }
    const category = findMatchingCategory(categoryText);

    // Extract company - try to find it in the content structure
    let company = 'Unknown';
    // Try to find company name in the page structure
    const $content = $('main, article, [class*="content"]').first();
    if ($content.length) {
      // Look for company name in headings or near category
      const $categorySection = $content.find('a[href*="product-management-case-studies-categories"]').first();
      if ($categorySection.length) {
        const $parent = $categorySection.closest('li, div, article');
        const companyText = $parent.find('strong, b, [class*="company"]').first().text().trim();
        if (companyText) {
          company = companyText;
        }
      }
    }
    
    // Fallback: try to extract from H1 or title
    if (company === 'Unknown') {
      const h1Text = $('h1').first().text();
      // Sometimes company appears before question
      const match = h1Text.match(/^([^-?]+?)(?:\s*[-?])/);
      if (match) {
        company = match[1].trim();
      }
    }

    // Extract question (usually a heading or prominently displayed)
    let question = null;

    // Strategy 1: Look in headings
    $('h1, h2, h3, [class*="question"], [class*="title"]').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('?') && text.length > 20 && text.length < 500) {
        question = text;
        return false;
      }
    });

    // Strategy 2: Look in first paragraph or intro section
    if (!question) {
      $('[class*="intro"], [class*="header"], [class*="lead"], p:first-of-type').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('?') && text.length > 30 && text.length < 500) {
          question = text;
          return false;
        }
      });
    }

    // Strategy 3: Look for any text with question mark in main content
    if (!question) {
      $('p, div, span').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('?') && text.length > 30 && text.length < 500 && !text.includes('http')) {
          question = text;
          return false;
        }
      });
    }

    // Extract answer content (main body text, excluding nav/footer)
    const answerParts = [];
    let $main = $('main, article, [class*="content"], [class*="body"], [class*="post-content"]').first();

    // If no main found, try to find the main content area
    if ($main.length === 0) {
      $main = $('body').first();
    }

    // Remove unwanted elements
    $main.find('nav, footer, header, [class*="nav"], [class*="footer"], [class*="sidebar"], script, style, [class*="share"], [class*="related"]').remove();

    if ($main.length > 0) {
      // Extract structured content - sections with headings and content
      const sections = [];
      
      // Get all headings and their following content
      $main.find('h3, h4').each((i, headingEl) => {
        const $heading = $(headingEl);
        const headingText = $heading.text().trim();
        
        // Skip navigation and social sharing headings
        if (headingText.toLowerCase().includes('share') || 
            headingText.toLowerCase().includes('browse related') ||
            headingText.toLowerCase().includes('join')) {
          return;
        }
        
        // Get content after this heading until next heading
        let sectionContent = [headingText];
        let $next = $heading.next();
        
        while ($next.length && !$next.is('h1, h2, h3, h4')) {
          const text = $next.text().trim();
          if (text && text.length > 20) {
            sectionContent.push(text);
          }
          $next = $next.next();
          
          // Limit to prevent infinite loops
          if (sectionContent.length > 50) break;
        }
        
        if (sectionContent.length > 1) {
          sections.push(sectionContent.join('\n\n'));
        }
      });
      
      // If we got structured sections, use them
      if (sections.length > 0) {
        answerParts.push(...sections);
      } else {
        // Fallback: extract paragraphs and lists
        $main.find('p, ul, ol, li').each((i, el) => {
          const text = $(el).text().trim();
          // Filter out navigation, ads, and very short text
          if (
            text &&
            text.length > 30 &&
            !text.toLowerCase().includes('read case study') &&
            !text.toLowerCase().includes('subscribe') &&
            !text.toLowerCase().includes('click here') &&
            !text.toLowerCase().includes('share on') &&
            !text.match(/^https?:\/\//) // Not a URL
          ) {
            answerParts.push(text);
          }
        });
      }
    } else {
      // Fallback: get all meaningful paragraphs, excluding navigation areas
      $('body p, body div[class*="content"]').each((i, el) => {
        const $el = $(el);
        // Skip if in nav/footer/sidebar
        if ($el.closest('nav, footer, header, [class*="nav"], [class*="sidebar"]').length > 0) {
          return;
        }

        const text = $el.text().trim();
        if (
          text &&
          text.length > 50 &&
          !text.toLowerCase().includes('read case study') &&
          !text.toLowerCase().includes('subscribe') &&
          !text.match(/^https?:\/\//)
        ) {
          answerParts.push(text);
        }
      });
    }

    // Remove duplicates and clean up
    const uniqueParts = [];
    const seen = new Set();
    for (const part of answerParts) {
      const normalized = part.substring(0, 200); // Use first 200 chars as key
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueParts.push(part);
      }
    }

    const answer = uniqueParts.join('\n\n').trim();

    // Extract key points if there are bullet lists (in main content only)
    const keyPoints = [];
    if ($main.length > 0) {
      $main.find('ul li, ol li').each((i, el) => {
        const text = $(el).text().trim();
        // Filter out navigation and social links
        if (text && 
            text.length > 10 && 
            text.length < 200 &&
            !text.toLowerCase().includes('share') &&
            !text.toLowerCase().includes('subscribe') &&
            !text.match(/^https?:\/\//)) {
          keyPoints.push(text);
        }
      });
    }

    if (!question || !answer || answer.length < 100) {
      return null;
    }

    return {
      company,
      category: PRODUCTFOLKS_CATEGORIES[category] || 'Product Strategy',
      question: cleanText(question),
      answer: cleanText(answer),
      title: `${company} - ${question.substring(0, 80)}`,
      keyPoints: keyPoints.length > 0 ? keyPoints.slice(0, 10) : null,
    };
  } catch (error) {
    console.error(`Error scraping page ${url}:`, error.message);
    return null;
  }
}

function findMatchingCategory(text) {
  const lowerText = text.toLowerCase();

  for (const [key] of Object.entries(PRODUCTFOLKS_CATEGORIES)) {
    if (lowerText.includes(key.toLowerCase())) {
      return key;
    }
  }

  if (lowerText.includes('root') || lowerText.includes('rca')) return 'RCA';
  if (lowerText.includes('metric')) return 'Metrics';
  if (lowerText.includes('guess')) return 'Guesstimates';
  if (lowerText.includes('design')) return 'Product Design';
  if (lowerText.includes('improve')) return 'Product Improvement';
  if (lowerText.includes('strategy')) return 'Product Strategy';

  return 'Product Strategy';
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

// Run if called directly
if (require.main === module) {
  scrapeProductFolksWithAnswers()
    .then(() => {
      console.log('✅ Enhanced Product Folks scraping completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeProductFolksWithAnswers };
