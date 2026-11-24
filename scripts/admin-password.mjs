// Sets the facilitator (admin) password. Only a salted scrypt hash is stored in the database.
// Run: npm run admin:password   (asks for the password; nothing is echoed or written to disk)
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Pool } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (put it in .env.local).');
  process.exit(1);
}

/** Read one line, showing * for each character typed. Falls back to a plain line read without a terminal. */
function ask(prompt) {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin });
    return new Promise(resolve => rl.once('line', line => { rl.close(); resolve(line); }));
  }
  return new Promise(resolve => {
    let value = '';
    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\r\n');
      resolve(value);
    };
    const onData = chunk => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003') {
          process.stdout.write('\nCancelled. Nothing was changed.\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else if (ch >= ' ') {
          value += ch;
          process.stdout.write('*');
        }
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
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
