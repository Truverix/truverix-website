// Shared Supabase helper. Uses the service_role key — never the anon/public
// key — because this code runs only on the server (inside Vercel serverless
// functions) and needs to write to tables that have Row Level Security
// enabled with no public policies. The service_role key must never be sent
// to the browser or committed to the repo; it only ever lives in Vercel's
// environment variables.
//
// The client is cached on `globalThis` so a warm Vercel function container
// reuses the same client instead of reconnecting on every request.

const { createClient } = require('@supabase/supabase-js');

function getClient() {
  if (globalThis.__truverixSupabase) {
    return globalThis.__truverixSupabase;
  }

  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  globalThis.__truverixSupabase = client;
  return client;
}

module.exports = { getClient };
