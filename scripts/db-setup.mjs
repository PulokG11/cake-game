// Applies db/schema.sql to DATABASE_URL (idempotent). Run: npm run db:setup
import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (put it in .env.local).');
  process.exit(1);
}

const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: url });
try {
  await pool.query(sql);
  const { rows } = await pool.query(`
    SELECT (SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
           (SELECT string_agg(proname, ', ' ORDER BY proname) FROM pg_proc WHERE pronamespace = 'public'::regnamespace) AS functions,
           (SELECT password_hash IS NOT NULL FROM admin_settings WHERE id = 1) AS admin_password_set`);
  console.log('Schema applied.', rows[0]);
} finally {
  await pool.end();
}
