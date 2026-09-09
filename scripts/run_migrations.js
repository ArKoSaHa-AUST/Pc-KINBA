#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DIRECT_URL;

if (!dbUrl) {
  console.log(`
================================================================================
  Supabase Migration Runner
================================================================================
  No DATABASE_URL found in environment variables.

  Option 1 (Recommended): Run via Supabase Dashboard SQL Editor
  1. Open: https://supabase.com/dashboard/project/jkooxrfapqvwmoygswjv/sql
  2. Paste the contents of:
     supabase/migrations/pending_migrations.sql (for unapplied tables/views)
     OR
     supabase/migrations/all_migrations_consolidated.sql (full database setup)
  3. Click "Run".

  Option 2: Run via CLI with Postgres Connection String
  DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" node scripts/run_migrations.js
================================================================================
  `);
  process.exit(0);
}

async function run() {
  let pg;
  try {
    pg = await import('pg');
  } catch {
    try {
      pg = await import('../client/node_modules/pg/lib/index.js');
    } catch (e) {
      console.error('pg module not found. Install pg with: npm install pg');
      process.exit(1);
    }
  }

  const { Client } = pg.default || pg;
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(__dirname, '../supabase/migrations/pending_migrations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying pending migrations...');
    await client.query(sql);
    console.log('✅ Migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
