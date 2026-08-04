const { getClient } = require('./_lib/supabase');
const { verifyTurnstile } = require('./_lib/turnstile');
const { notifyNewLead } = require('./_lib/notify');

const CONSENT_TEXT_VERSION = 'privacy-policy-v1-2026-08';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    const { name, email, phone, company, subject, message, turnstileToken, consentGiven } = body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (consentGiven !== true) {
      res.status(400).json({ error: 'Consent is required to submit this form' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
    const humanVerified = await verifyTurnstile(turnstileToken, ip);
    if (!humanVerified) {
      res.status(400).json({ error: 'Bot verification failed, please try again' });
      return;
    }

    const userAgent = req.headers['user-agent'] || '';
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ') || null;
    const supabase = getClient();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        type: 'contact',
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        company: company || null,
        interest: subject,
        message,
        source_page: 'contact_page',
        ip_address: ip || null,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (leadError) throw leadError;

    const { error: consentError } = await supabase
      .from('consent_records')
      .insert({
        lead_id: lead.id,
        consent_type: 'contact_form',
        consent_given: true,
        consent_text_version: CONSENT_TEXT_VERSION,
        purpose: 'Respond to a general enquiry',
        ip_address: ip || null,
        user_agent: userAgent,
      });

    if (consentError) throw consentError;

    await notifyNewLead({ type: 'contact', name, email, company, message });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/contact failed:', err);
    res.status(500).json({ error: 'Something went wrong, please try again shortly' });
  }
};
