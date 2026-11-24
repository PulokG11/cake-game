// Sets the facilitator (admin) password. Only a salted scrypt hash is stored in the database.
// Run: npm run admin:password   (asks for the password; nothing is echoed or written to disk)
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (put it in .env.local).');
  process.exit(1);
}

function ask(prompt) {
  const muted = new Writable({ write: (_chunk, _enc, cb) => cb() });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  process.stdout.write(prompt);
  return new Promise(resolve =>
    rl.question('', answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    }),
  );
}

const password = (await ask('New facilitator password (min 8 characters): ')).trim();
if (password.length < 8) {
  console.error('The password must be at least 8 characters. Nothing was changed.');
  process.exit(1);
}
if ((await ask('Type it again: ')).trim() !== password) {
  console.error('The two entries did not match. Nothing was changed.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 32).toString('base64')}`;
const pool = new Pool({ connectionString: url });
try {
  await pool.query(
    `INSERT INTO admin_settings (id, password_hash, updated_at) VALUES (1, $1, now())
     ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [hash],
  );
  console.log('Facilitator password saved. Use it to sign in on the Admin page.');
} finally {
  await pool.end();
}
