const bcrypt = require('bcryptjs');
const { setSessionCookie } = require('../_lib/auth');

// Basic in-memory rate limiting per warm container: slows down brute-force
// guessing without needing an extra service. Resets whenever Vercel spins up
// a fresh function instance, which is an acceptable tradeoff at this scale.
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, windowStart: now };
  if (now - record.windowStart > WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }
  if (record.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many attempts, please try again later' });
    return;
  }

  const { username, password } = req.body || {};
  const validUsername = username === process.env.ADMIN_USERNAME;
  const validPassword = validUsername && password
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  record.count += 1;
  attempts.set(ip, record);

  if (!validUsername || !validPassword) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  setSessionCookie(res, username);
  res.status(200).json({ ok: true });
};
