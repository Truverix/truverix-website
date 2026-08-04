# TruveriX website — setup guide

Everything in this repo is finished, working code. You do not need to write
or edit anything. What's left is a short list of clicks in four free
dashboards (GitHub, Supabase, Cloudflare, Vercel) plus one DNS record at
GoDaddy. None of it requires a developer — just following the steps below in
order. Budget about 45–60 minutes the first time.

A note on why you're doing these clicks yourself rather than me: none of
these services let an outside party log in on your behalf, and handling your
passwords or account creation isn't something I can do even if you'd rather
hand it off — so every step below is written to be as close to copy-paste as
possible.

---

## Step 1 — Put the code on GitHub (no git required)

1. Go to [github.com](https://github.com) and sign in (or create a free account).
2. Click the **+** icon top-right → **New repository**.
3. Name it `truverix-website`, set it to **Private**, don't add a README (we already have one) → **Create repository**.
4. On the new repo's page, click **uploading an existing file**.
5. **Open the `truverix-website-final` folder on your computer first** (double-click into it), select **everything inside it** — `index.html`, every service folder (`employment-verification`, `criminal-verification`, etc.), `admin`, `api`, `sql`, `sitemap.xml`, `robots.txt`, and the rest — then drag *those selected items* into GitHub's upload box. Don't drag the outer folder itself, only what's inside it.
6. Scroll down, click **Commit changes**.

The site is now a real multi-page site — each service lives at its own address (e.g. `/employment-verification/index.html`), which is what makes each page separately indexable by Google.

---

## Step 2 — Supabase database (free)

1. Go to [supabase.com](https://supabase.com) → sign up free.
2. **New project** → name it `truverix` → choose the region closest to India that's offered on the free tier (Singapore, if available, gives the lowest latency) → set a database password (save it somewhere safe, though the app itself won't need it directly).
3. Wait ~2 minutes for it to provision, then go to **SQL Editor → New query**.
4. Paste the entire contents of `sql/schema.sql` (in this repo) and click **Run**. This creates the `leads` and `consent_records` tables, locks them down with Row Level Security, and creates a `leads_with_consent` reporting view.
5. Go to **Settings → API**. Copy the **Project URL** and the **service_role** key — specifically the one labelled `service_role`, *not* `anon`/`public`. The service_role key is what lets the backend write to the tables; the anon key intentionally can't, since Row Level Security blocks it.

You now have: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**One thing to know:** free Supabase projects auto-pause after 7 days with no API activity (the data isn't lost, but the project goes offline until you click **Restore** in the dashboard). Once the site is live this is unlikely to matter, but if forms suddenly start erroring after a quiet week, check the Supabase dashboard for a paused-project banner first.

---

## Step 3 — Cloudflare Turnstile (free bot protection — no DNS change)

Since you're keeping DNS at GoDaddy, we're using only Turnstile (the widget
that blocks bots on your forms) and skipping Cloudflare's full network proxy.
Turnstile works on any site regardless of who hosts your DNS.

1. Go to [cloudflare.com](https://cloudflare.com) → sign up free.
2. Dashboard → **Turnstile** → **Add a site**.
3. Domain: `truverix.com`. Widget mode: **Managed**.
4. Copy the **Site Key** and **Secret Key** shown.

You now have: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.

---

## Step 4 — (Optional) Resend for email notifications

Skip this if you're fine checking the admin dashboard manually for now.

1. Go to [resend.com](https://resend.com) → sign up free (100 emails/day).
2. **API Keys → Create API Key** → copy it.
3. Verify `truverix.com` under **Domains** so emails send from `@truverix.com` (or skip and use their shared test domain for now).

You now have: `RESEND_API_KEY`.

---

## Step 5 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up free, choosing **"Continue with GitHub"** so it can see your repo.
2. **Add New → Project** → select `truverix-website` → **Import**.
3. Framework Preset: **Other**. Leave Build Command and Output Directory blank.
4. Before clicking Deploy, open **Environment Variables** and add every value from `ENVIRONMENT-VARIABLES.txt` in this repo (real values, not placeholders) — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_JWT_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and the Resend ones if using Step 4.
5. Click **Deploy**.
6. **Important:** once it's live, go to **Settings → General → your plan** and upgrade to **Pro ($20/month)**. Vercel's free Hobby plan is restricted to non-commercial personal projects in their Terms of Service — a company lead-gen site doesn't qualify, so Pro is the correct plan here even before you have revenue.
7. Open `index.html` in this repo (before or after upload) and replace both instances of `TURNSTILE_SITE_KEY_PLACEHOLDER` with your real Turnstile site key from Step 3, then re-upload that one file to GitHub — Vercel will redeploy automatically.

---

## Step 6 — Point GoDaddy at Vercel

1. In Vercel, go to your project → **Settings → Domains** → add `truverix.com` and `www.truverix.com`. Vercel will show you exact DNS values to use (usually an `A` record to `76.76.21.21` and a `CNAME` for `www` to `cname.vercel-dns.com`).
2. In GoDaddy, go to **My Products → DNS** for truverix.com, and add/edit those exact records to match what Vercel showed you.
3. DNS changes can take up to a few hours to fully propagate.

---

## Step 7 — Test end to end

1. Visit your site, open **Book a Demo**, fill it out, complete the Turnstile check, submit.
2. Go to `truverix.com/admin/` → log in with username `admin` and the password shown in `ENVIRONMENT-VARIABLES.txt` (change this later — see below).
3. Confirm the test lead appears in the table, then click **Download CSV** to confirm the export works.
4. Spot-check a few service pages load correctly, e.g. `truverix.com/criminal-verification`, `truverix.com/dpdpa-compliance`.

## Step 8 — Submit the sitemap to Google (SEO)

1. Go to [Google Search Console](https://search.google.com/search-console) and add `truverix.com` as a property, if you haven't already.
2. Under **Sitemaps**, submit: `https://www.truverix.com/sitemap.xml`
3. This tells Google about every page on the site at once, rather than waiting for it to discover them one at a time.

---

## Rotating the admin password later

Send me the new password you'd like (or ask me to generate another random
one) and I'll generate a fresh bcrypt hash for you the same way — you then
just paste the new hash into Vercel's environment variables and redeploy.
Nobody, including me, ever needs to store your real password anywhere.

---

## What's actually protecting this site

- **Cloudflare Turnstile** blocks bots on both forms before anything touches your database.
- **DPDPA consent** is logged as a separate, timestamped, IP-stamped record every time someone submits a form — not just a checkbox that disappears.
- **Admin session** is an httpOnly, Secure, signed cookie — it can't be read by page JavaScript or stolen via a script injection.
- **Database access** uses Row Level Security with no public policies — the anon/public key can't read or write the tables at all; only the server-side service_role key can, and that key never reaches the browser.
