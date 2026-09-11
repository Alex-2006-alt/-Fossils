import { PrismaClient } from '../../../frontend/node_modules/@prisma/client';
import path from 'path';

// Since the DB is in the frontend folder, we override the URL
const dbPath = path.resolve(process.cwd(), '../frontend/dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

export default prisma;
