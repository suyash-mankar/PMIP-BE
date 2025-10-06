#!/bin/bash

# PM Interview Practice Backend - Quick Start with Supabase
# This script helps you set up the development environment with Supabase

set -e

echo "🚀 PM Interview Practice Backend - Supabase Setup"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   SUPABASE SETUP${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""
echo "1. Go to https://supabase.com and sign up (FREE)"
echo "2. Click 'New Project'"
echo "3. Fill in project details and wait ~2 minutes"
echo "4. Go to Settings → Database"
echo "5. Copy the 'Connection string' (URI format)"
echo ""
echo -e "${YELLOW}It looks like:${NC}"
echo "postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:5432/postgres"
echo ""
read -p "Press Enter after you have your Supabase DATABASE_URL ready..."

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "📝 Creating .env from template..."
    
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres.xxxxx:your_password@aws-0-region.pooler.supabase.com:5432/postgres"
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_in_production
OPENAI_API_KEY=sk-proj-your-openai-key-here
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
ADMIN_SECRET=admin_secret_key
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your credentials!${NC}"
    echo ""
    echo "Required:"
    echo "  1. DATABASE_URL from Supabase (just copied)"
    echo "  2. JWT_SECRET (run: openssl rand -base64 32)"
    echo "  3. OPENAI_API_KEY from platform.openai.com"
    echo "  4. STRIPE_SECRET_KEY from dashboard.stripe.com (optional for now)"
    echo ""
    read -p "Press Enter after you've updated .env with your credentials..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Generate Prisma Client
echo ""
echo "⚙️  Generating Prisma Client for PostgreSQL..."
npx prisma generate

# Run migrations
echo ""
echo "🔄 Running Prisma migrations..."
npx prisma migrate dev --name init

# Seed database
echo ""
echo "🌱 Seeding database..."
npm run seed

# Success!
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Demo user created:"
echo "  Email: demo@pmpractice.com"
echo "  Password: Demo123456!"
echo ""
echo "📚 Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Test health endpoint: curl http://localhost:4000/api/health"
echo "  3. View database: npx prisma studio"
echo "  4. Or view in Supabase dashboard: Table Editor"
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo "  • SUPABASE_SETUP.md - Detailed Supabase guide"
echo "  • GETTING_STARTED.md - Quick start"
echo "  • README.md - Complete docs"
echo ""
echo "Happy coding! 🎉"
