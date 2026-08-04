// Admin session helper — signs and verifies a short-lived JWT stored in an
// httpOnly cookie. Nothing here is exposed to client-side JavaScript, so the
// token can't be read or stolen via XSS.

const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'truverix_admin_session';
const SESSION_HOURS = 12;

function signSession(username) {
  return jwt.sign({ sub: username }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: `${SESSION_HOURS}h`,
  });
}

function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

// Returns the decoded token payload if the request carries a valid admin
// session cookie, or null if missing/invalid/expired.
function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch {
    return null;
  }
}

function setSessionCookie(res, username) {
  const token = signSession(username);
  const maxAge = SESSION_HOURS * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// Call at the top of any protected admin API route.
// Returns true and lets the caller continue if authorised;
// writes a 401 response and returns false otherwise.
function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  return true;
}

module.exports = { getSession, setSessionCookie, clearSessionCookie, requireAdmin };
