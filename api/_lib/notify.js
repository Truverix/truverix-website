// Sends an email via Resend when a new lead comes in. This is optional —
// if RESEND_API_KEY isn't set, it silently skips instead of failing the
// whole form submission. A missing email notification should never block a
// lead from being saved to the database.

async function notifyNewLead({ type, name, email, company, message }) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM || 'noreply@truverix.com',
        to: process.env.NOTIFY_EMAIL_TO || 'sales@truverix.com',
        subject: `New ${type === 'demo' ? 'demo request' : 'contact enquiry'}: ${name}`,
        text: [
          `Type: ${type}`,
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company || '—'}`,
          '',
          message || '(no message)',
        ].join('\n'),
      }),
    });
  } catch (err) {
    // Log but don't throw — a failed notification email must not lose the lead.
    console.error('notifyNewLead failed:', err);
  }
}

module.exports = { notifyNewLead };
