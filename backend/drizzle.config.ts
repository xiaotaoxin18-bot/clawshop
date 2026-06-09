import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUDA_DATABASE_URL || 'postgresql://appuser:changeme@localhost:5432/inventory_db',
  },
});
