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
    const {
      firstName, lastName, email, phone, company, size, interest, message,
      turnstileToken, consentGiven,
    } = body;

    // -- Basic server-side validation --
    if (!firstName || !lastName || !email || !company) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (consentGiven !== true) {
      res.status(400).json({ error: 'Consent is required to submit this form' });
      return;
    }

    // -- Bot check (Cloudflare Turnstile) --
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
    const humanVerified = await verifyTurnstile(turnstileToken, ip);
    if (!humanVerified) {
      res.status(400).json({ error: 'Bot verification failed, please try again' });
      return;
    }

    const userAgent = req.headers['user-agent'] || '';
    const supabase = getClient();

    // -- Store the lead --
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        type: 'demo',
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        company,
        company_size: size || null,
        interest: interest || null,
        message: message || null,
        source_page: 'demo_modal',
        ip_address: ip || null,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (leadError) throw leadError;

    // -- Store the consent record (the DPDPA-critical part) --
    const { error: consentError } = await supabase
      .from('consent_records')
      .insert({
        lead_id: lead.id,
        consent_type: 'demo_form',
        consent_given: true,
        consent_text_version: CONSENT_TEXT_VERSION,
        purpose: 'Schedule and follow up on a product demo',
        ip_address: ip || null,
        user_agent: userAgent,
      });

    if (consentError) throw consentError;

    await notifyNewLead({
      type: 'demo',
      name: `${firstName} ${lastName}`,
      email,
      company,
      message,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('POST /api/demo failed:', err);
    res.status(500).json({ error: 'Something went wrong, please try again shortly' });
  }
};
