# The Product Folks Scraper - Implementation Summary

## Overview

Successfully implemented a web scraper to extract PM case studies from The Product Folks website and added support for the new "Product Improvement" category across the application.

## Implementation Date

October 26, 2025

## What Was Done

### 1. Created Backend Scraper Script ✅

**File**: `/PMIP-BE/scripts/scrape-productfolks-questions.js`

**Features**:

- Scrapes case studies from https://www.theproductfolks.com/product-management-case-studies
- Extracts: Question text, Category type, Company name
- Maps categories to database format (title case):
  - "RCA" → `RCA`
  - "Metrics" → `Metrics`
  - "Guesstimates" → `Guesstimates`
  - "Product Design" → `Product Design`
  - "Product Improvement" → `Product Improvement`
  - "Product Strategy" → `Product Strategy`
- Stores source as "theproductfolks"
- Skips duplicate questions automatically
- Includes comprehensive error handling and logging

### 2. Initial Scraping Results ✅

**Execution Date**: October 26, 2025

**Statistics**:

- **Total scraped**: 59 case studies
- **Total added**: 59 questions
- **Duplicates skipped**: 0

**Category Breakdown**:

- Product Improvement: 18 questions ⚡ (NEW CATEGORY!)
- Metrics: 18 questions 📊
- Guesstimates: 15 questions 🎯
- Product Design: 8 questions 🏗️

**Sample Questions Added**:

1. [Spotify] How will you improve ads on Spotify?
2. [Hotstar] How can you improve the IPL viewing experience of a user watching it on Hotstar?
3. [Reynolds] How will you improve Reynolds blue ballpoint pen?
4. [Indigo] How will you improve the post-booking services of IndiGo?
5. [Google] How would you design Google Home Mini for the blind people?

### 3. Updated Frontend Marketing Copy ✅

**Files Updated**:

- `/PMIP-FE/src/pages/Landing/Landing.jsx` (3 locations)
- `/PMIP-FE/src/pages/Pricing/Pricing.jsx` (3 locations)

**Changes**:

- Updated category lists to include "Product Improvement" and "Guesstimates"
- Before: "Product Design, Metrics, RCAs, and Strategy"
- After: "Product Design, Product Improvement, Metrics, RCAs, Guesstimates, and Strategy"

### 4. Frontend Category Icon Support ✅

**No changes required** - The existing `renderCategoryIcon()` function in `/PMIP-FE/src/pages/Interview/Interview.jsx` already includes support for "Product Improvement":

- Displays a lightning bolt icon ⚡ for categories containing "improvement"
- Works automatically with the `product_improvement` category value

### 5. Database Integration ✅

**Current Database State** (After Standardization):

```
Categories in database:
- Product Design: 779 questions
- Metrics: 268 questions
- Product Strategy: 220 questions
- Behaviourial: 153 questions
- Guesstimates: 128 questions
- RCA: 99 questions
- Tech Acumen: 77 questions
- Product Improvement: 18 questions (NEW!)
```

**Note**: All categories now use standardized title case format (e.g., "Product Design", "Metrics") for consistency.

## How It Works

### Backend Flow:

1. Scraper fetches HTML from The Product Folks website
2. Uses Cheerio to parse case study cards
3. Extracts company, category, and question text
4. Maps category names to database format
5. Checks for duplicates (case-insensitive text comparison)
6. Inserts new questions with source="theproductfolks"

### Frontend Flow:

1. Backend API (`/api/categories`) dynamically queries database
2. Groups questions by category and returns counts
3. Frontend receives categories and displays them as cards
4. Each category gets appropriate icon from `renderCategoryIcon()`
5. "Product Improvement" displays with lightning bolt icon ⚡

## How to Use

### Running the Scraper:

```bash
cd PMIP-BE
node scripts/scrape-productfolks-questions.js
```

### Expected Output:

```
🕷️  Starting Product Folks question scraping...
📍 Source: https://www.theproductfolks.com/product-management-case-studies
🔍 Fetching case studies page...
✓ Found X cards using selector: .case-study-card

📊 Found X case studies
💾 Adding to database...

✅ Added: [Company] Category - Question text...
...

🎉 Scraping completed!
📊 Total scraped: X
✅ Total added: X
⏭️  Duplicates skipped: X
```

### Verifying Results:

```bash
# Check categories in database
cd PMIP-BE
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.question.groupBy({ by: ['category'], _count: { id: true } }).then(cats => { console.log('Categories:'); cats.forEach(c => console.log(\`  - \${c.category}: \${c._count.id}\`)); }).finally(() => prisma.\$disconnect());"

# Check Product Improvement questions
cd PMIP-BE
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.question.findMany({ where: { category: 'product_improvement' }, select: { text: true, company: true } }).then(questions => { console.log('Product Improvement Questions:'); questions.forEach(q => console.log(\`  - \${JSON.parse(q.company)[0]}: \${q.text.substring(0, 60)}...\`)); }).finally(() => prisma.\$disconnect());"
```

## User Experience

### Before:

- Categories: Product Design, Metrics, RCAs, Strategy, Guesstimates
- Question sources: NextLeap, Exponent, Curated

### After:

- Categories: Product Design, **Product Improvement** ⚡, Metrics, RCAs, Strategy, Guesstimates
- Question sources: NextLeap, Exponent, Curated, **The Product Folks**
- **+59 new case studies** from real PM interviews
- **+18 Product Improvement questions** (new category)

## Technical Details

### Category Mapping Logic:

```javascript
// Using title case to match existing database format
const PRODUCTFOLKS_CATEGORIES = {
  RCA: 'RCA',
  'Root Cause Analysis': 'RCA',
  Metrics: 'Metrics',
  Guesstimates: 'Guesstimates',
  'Product Design': 'Product Design',
  'Product Improvement': 'Product Improvement',
  'Product Strategy': 'Product Strategy',
};
```

### Data Storage Format:

```javascript
{
  text: "How will you improve ads on Spotify?",
  category: "Product Improvement",  // Title case format
  company: '["Spotify"]',  // JSON array as string
  tags: '["spotify", "product improvement"]',  // JSON array as string
  source: "theproductfolks"
}
```

### Frontend Icon Rendering:

```javascript
// Existing code in Interview.jsx (lines 314-320)
if (normalizedCategory.includes('improvement')) {
  return (
    <svg {...iconProps}>
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" /> {/* Lightning bolt */}
    </svg>
  );
}
```

## Files Modified

### New Files:

- `/PMIP-BE/scripts/scrape-productfolks-questions.js` - Main scraper script
- `/PMIP-BE/scripts/fix-category-names.js` - Category standardization migration

### Updated Files:

- `/PMIP-FE/src/pages/Landing/Landing.jsx` - Updated marketing copy (3 locations)
- `/PMIP-FE/src/pages/Pricing/Pricing.jsx` - Updated marketing copy (3 locations)

### Referenced (No Changes Needed):

- `/PMIP-BE/prisma/schema.prisma` - Question model
- `/PMIP-FE/src/pages/Interview/Interview.jsx` - Category icon rendering
- `/PMIP-BE/src/controllers/interviewController.js` - getCategories API

## Future Enhancements

### Potential Improvements:

1. **Scheduled Updates**: Set up cron job to automatically scrape new questions periodically
2. **More Sources**: Add scrapers for other PM question websites
3. ~~**Category Normalization**: Standardize category naming~~ ✅ **COMPLETED** - All categories now use title case
4. **Question Quality**: Add difficulty levels and tags for better filtering
5. **Duplicate Detection**: Enhance to catch similar questions (not just exact matches)

### Running Periodic Updates:

```bash
# Add to crontab for weekly updates
0 0 * * 0 cd /path/to/PMIP-BE && node scripts/scrape-productfolks-questions.js
```

## Success Metrics

✅ **59 new questions** added to database  
✅ **18 Product Improvement questions** in new category  
✅ **100% success rate** on initial scrape  
✅ **Zero duplicates** detected and skipped  
✅ **Frontend automatically displays** new category  
✅ **Marketing copy updated** across 6 locations  
✅ **Zero linter errors** in all modified files

## Conclusion

The Product Folks scraper has been successfully implemented and integrated into the PM Interview Practice application. Users can now practice with 59 additional real-world case studies from companies like Spotify, Google, Netflix, Hotstar, and more. The new "Product Improvement" category adds diversity to the question types available, making the platform more comprehensive for PM interview preparation.

---

**Status**: ✅ Complete  
**Source Attribution**: The Product Folks (https://www.theproductfolks.com/)  
**Implementation Quality**: Production-ready  
**Testing**: Passed (scraper executed successfully, data verified in database)
