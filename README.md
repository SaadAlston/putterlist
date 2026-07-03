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

## Password login

The sign-in screen now has two tabs: Password and Email Link. Either works
for anyone, admin or member.

**If you already have an account** (signed in before with a magic link),
the fastest path around email problems: sign in with a link one more time,
then click Set Password in the sidebar. From then on, sign in with that
password instead. No email needed.

**If you are brand new**, "Create an account" under the Password tab still
sends a confirmation email first. This uses the same mail system as the
Email Link tab, so it hits the same delivery limits if your SMTP setup has
problems. Password login removes email from every sign-in after the first
one. It does not remove the first one.

## Managing users from the app

The Dashboard now shows a Manage Users table above the People section,
listing each joined person's email, join date, and last sign-in.

This requires the `list-users` Edge Function. Deploy it once:

```bash
supabase functions deploy list-users
```

No new secrets needed.

## Personalizing the welcome email

Run `supabase-schema-v3.sql` first, if you haven't. It adds a column that
stores who sent each invite, needed for personalization.

The app now sends the invited person's name and the inviting admin's email
to Supabase as sign-in metadata. Supabase makes this available in your
email template as `{{ .Data.name }}` and `{{ .Data.invited_by }}`.

Update your template in Supabase, under Authentication, Email Templates,
Magic Link:

```html
<h2>{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hello,{{ end }}</h2>
<p>
  {{ if .Data.invited_by }}
    {{ .Data.invited_by }} added you to PutterList.
  {{ else }}
    Sign in to PutterList using the link below.
  {{ end }}
</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

This works with Supabase's default mailer. For your own sender address and
higher sending limits, connect a custom SMTP provider like Resend or
Postmark under Authentication, SMTP Settings.

## Sharing boards with multiple people

Click the eye icon next to any person's name in the sidebar. Check off
anyone who has already joined. They now see that board too, alongside
their own.

Shared access is view only. Anyone you share a board with can look at it
but cannot add, edit, move, or delete anything there. Only the admin and
the board's own person can make changes.

You can share one board with several people, and one person can view
several boards. Toggle a checkbox off to revoke access instantly.

## Removing people

Click the trash icon next to a person's name. This deletes their to-dos.
If they already joined, it also deletes their login. They can't sign back in
with that email and see old data.

This requires the `remove-user` Edge Function. Deploy it once:

```bash
supabase functions deploy remove-user
```

No extra secrets needed. It uses the same service role key Supabase already
provides to your functions.

## Locking in admin access

Your role is normally decided by a database lookup. If that lookup ever
misfires, for example a stray record links your email to a person by
mistake, you could get bumped into a member view of your own board.

Fix this by locking your email in as admin. Add to `.env.local` and to your
Vercel project's environment variables:

```
VITE_ADMIN_EMAILS=you@example.com
```

Separate multiple admins with commas. Anyone on this list always gets admin
access, checked before any database lookup runs.

## Sending invites from the app

Click the link icon next to a person. Enter their email. Click Send Invite.
PutterList emails them directly through Resend. No copying, no pasting.

You can still skip the email and just grab a link, using "Just give me a
link" if you want to send it through text or another channel instead.

This requires the `send-invite-email` Edge Function and a Resend API key.
You already have both if you set up SMTP for the magic link email.

Deploy the function once:

```bash
supabase functions deploy send-invite-email
```

Set the secret if you have not already:

```bash
supabase secrets set RESEND_API_KEY=your-key-here
supabase secrets set NOTIFY_FROM_EMAIL="PutterList <notify@yourdomain.com>"
```

Without this set up, "Just give me a link" still works. Only the direct
email send needs Resend.

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
