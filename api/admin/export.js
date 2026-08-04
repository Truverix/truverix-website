const { requireAdmin } = require('../_lib/auth');
const { getClient } = require('../_lib/supabase');

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('leads_with_consent')
      .select('*');

    if (error) throw error;

    const headers = [
      'Lead ID', 'Type', 'First name', 'Last name', 'Email', 'Phone',
      'Company', 'Company size', 'Interest / subject', 'Message',
      'Source page', 'IP address', 'Submitted at',
      'Consent type', 'Consent given', 'Consent policy version',
      'Consent purpose', 'Consent given at', 'Consent withdrawn at',
    ];

    const lines = [headers.join(',')];
    for (const row of data) {
      lines.push([
        row.id, row.type, row.first_name, row.last_name, row.email, row.phone,
        row.company, row.company_size, row.interest, row.message,
        row.source_page, row.ip_address, row.created_at,
        row.consent_type, row.consent_given ? 'Yes' : 'No', row.consent_text_version,
        row.purpose, row.given_at, row.withdrawn_at,
      ].map(csvEscape).join(','));
    }

    const csv = lines.join('\n');
    const filename = `truverix-leads-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('GET /api/admin/export failed:', err);
    res.status(500).json({ error: 'Could not generate export' });
  }
};
