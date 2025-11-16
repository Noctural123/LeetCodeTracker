try {
  const { PrismaClient } = require('@prisma/client');
  console.log('Prisma Client loaded successfully');
  console.log('Client type:', typeof PrismaClient);
} catch(e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack);
}
