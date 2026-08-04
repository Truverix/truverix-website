const { requireAdmin } = require('../_lib/auth');
const { getClient } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
    const pageSize = 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = getClient();
    const { data, error } = await supabase
      .from('leads_with_consent')
      .select('*')
      .range(from, to);

    if (error) throw error;

    res.status(200).json({ page, pageSize, rows: data });
  } catch (err) {
    console.error('GET /api/admin/leads failed:', err);
    res.status(500).json({ error: 'Could not load leads' });
  }
};
