#!/bin/bash

# PM Interview Practice Backend - Quick Start Script
# This script helps you set up the development environment quickly

set -e

echo "🚀 PM Interview Practice Backend - Quick Start"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"

# Check MySQL
echo "🗄️  Checking MySQL..."
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  MySQL command not found. Make sure MySQL is installed and running.${NC}"
else
    MYSQL_VERSION=$(mysql --version)
    echo -e "${GREEN}✓ MySQL found${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "📝 Creating .env from template..."
    
    cat > .env << 'EOF'
DATABASE_URL="mysql://root:password@localhost:3306/pmpdb"
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
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your database credentials and API keys!${NC}"
    echo ""
    read -p "Press Enter after you've updated .env with your credentials..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Database setup
echo ""
echo "🗄️  Setting up database..."
echo "Please ensure MySQL is running and your .env has correct DATABASE_URL"
read -p "Press Enter to continue with database setup..."

# Create database if needed
echo "Creating database (if it doesn't exist)..."
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_NAME=${DB_NAME:-pmpdb}

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || echo -e "${YELLOW}Please create database '$DB_NAME' manually if needed${NC}"

# Run migrations
echo ""
echo "🔄 Running Prisma migrations..."
npx prisma migrate dev --name init

# Generate Prisma Client
echo "⚙️  Generating Prisma Client..."
npx prisma generate

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
echo "  3. Read documentation: cat README.md"
echo ""
echo -e "${YELLOW}Don't forget to add your OpenAI and Stripe API keys to .env!${NC}"
echo ""
echo "Happy coding! 🎉"
