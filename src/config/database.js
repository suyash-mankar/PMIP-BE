const { PrismaClient } = require('@prisma/client');

let prisma;
let isConnecting = false;

function createPrismaClient() {
  if (prisma) {
    return prisma;
  }

  // Build connection URL with connection pooling parameters
  // Optimized for Railway container with Supabase direct connection
  const connectionUrl = process.env.DATABASE_URL
    ? `${process.env.DATABASE_URL}${
        process.env.DATABASE_URL.includes('?') ? '&' : '?'
      }connection_limit=10&pool_timeout=30`
    : process.env.DATABASE_URL;

  // Production-optimized Prisma configuration for Supabase
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
  });

  return prisma;
}

async function connectWithRetry(maxRetries = 3) {
  if (isConnecting) {
    console.log('⏳ Connection attempt already in progress...');
    return prisma;
  }

  isConnecting = true;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Database connection attempt ${attempt}/${maxRetries}...`);

      // Disconnect old connection if exists
      if (prisma) {
        try {
          await prisma.$disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }

      // Create fresh client
      prisma = createPrismaClient();

      // Test connection
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;

      console.log('✅ Database connected successfully!');
      isConnecting = false;
      return prisma;
    } catch (error) {
      lastError = error;
      console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`⏱️  Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  isConnecting = false;
  console.error(`❌ All ${maxRetries} connection attempts failed`);
  console.error('Last error:', lastError?.message);

  // Return prisma client anyway - will use fallback in controllers
  return prisma;
}

// Initialize on startup
connectWithRetry();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔌 Disconnecting from database...');
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  process.exit(0);
});

module.exports = {
  prisma: new Proxy(
    {},
    {
      get: (target, prop) => {
        if (!prisma) {
          prisma = createPrismaClient();
        }
        return prisma[prop];
      },
    }
  ),
  connectWithRetry,
};
