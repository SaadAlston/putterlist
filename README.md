# PutterList

A shared kanban board. You (the admin) see everyone's tasks. Each person you
invite sees only their own — and can move their own cards, but can't delete
tasks or see anyone else's board.

## Stack
- Vite + React
- Supabase (Postgres + Auth + Realtime, magic-link email)
- Deployed on Vercel
- Optional: Resend for email digests via a Supabase Edge Function

## What's new in v2

- **Multi-user auth** — invite link per person, they sign in with their own
  email, and only ever see their own column of tasks.
- **Row-level security rewrite** — the database itself enforces who can see
  and edit what. Even a compromised frontend can't leak another person's
  tasks.
- **Admin vs member permissions** — you can delete tasks and people; invited
  members cannot.
- **Realtime sync** — changes made on one device or by a teammate show up
  live, no refresh needed.
- **Kenosha-inspired theme** — lake blue and sun gold, echoing the City of
  Kenosha's lakefront branding.
- **Opening animation** — a short sunrise-over-the-lake intro plays every
  time the app loads.
- **Error boundary** — a database hiccup shows a friendly reload screen
  instead of a blank page.
- **Mobile onboarding tip** — first-time mobile users get a one-time nudge
  about long-press-to-drag.

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase project URL and anon key
npm run dev
```

## Supabase setup

### If this is a brand-new project
1. Create a project at https://supabase.com
2. SQL Editor → paste `supabase-schema.sql` → Run
3. SQL Editor → paste `supabase-schema-v2.sql` → Run
4. Project Settings → API → copy the Project URL and **publishable** key into `.env.local`
5. Authentication → Providers → confirm Email is on
6. Authentication → URL Configuration → add your dev and prod URLs to the redirect allow list

### If you already ran v1's schema
Just run `supabase-schema-v2.sql` — it only adds new columns, tables, and
policies on top of what's there. Nothing destructive.

## How invites work

1. As the admin, click the link icon next to a person's name in the sidebar
2. Copy the link it generates, send it to them however you like (text, email, Slack)
3. They open it, enter their email, get a magic sign-in link
4. Once they click it, they're permanently linked to that person record —
   from then on, logging in with that email always shows just their tasks
5. A green dot next to their name in your sidebar means they've joined; gray means the invite is still pending

Invite links expire after 14 days if unused.

## Notifications (optional — needs setup)

The Edge Function in `supabase/functions/notify-overdue` emails a daily
digest of overdue and blocked tasks to the board owner. It needs:

1. A free account at https://resend.com, and a verified sending domain or their test address
2. Deploy the function: `supabase functions deploy notify-overdue`
3. Set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=your-key-here
   supabase secrets set NOTIFY_FROM_EMAIL="PutterList <notify@yourdomain.com>"
   ```
4. Uncomment and run the `cron.schedule(...)` block at the bottom of
   `supabase-schema-v2.sql`, filling in your project ref and anon key
   (requires enabling the `pg_cron` and `pg_net` extensions first, under
   Database → Extensions)

Without this setup, the app still shows overdue/blocked status visually in
the UI — you just won't get emailed about it.

## Rate limiting / abuse protection

Supabase's Auth already rate-limits magic-link requests per email and per IP
by default — no action needed for personal/small-team use. If this ever
becomes public-facing, turn on CAPTCHA under Authentication → Attack
Protection in the dashboard.

## Deploy to Vercel

1. Push this repo to GitHub
2. vercel.com → Add New Project → import the repo
3. Add environment variables before deploying:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. Settings → Domains → add your custom domain if you have one
6. Back in Supabase, add your production URL to the auth redirect allow list
