// Verifies a Cloudflare Turnstile token server-side before we trust a form
// submission. This is what actually blocks bots — the widget on the page is
// just the visible half; this check is the half that matters.

async function verifyTurnstile(token, remoteIp) {
  if (!token) return false;

  const body = new URLSearchParams();
  body.append('secret', process.env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  const data = await resp.json();
  return data.success === true;
}

module.exports = { verifyTurnstile };
