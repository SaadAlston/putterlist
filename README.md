# PutterList

A shared kanban board. One board per person, one login for you to see everything.

## Stack
- Vite + React
- Supabase (Postgres + Auth, magic link email)
- Deployed on Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase project URL and anon key
npm run dev
```

## Supabase setup

1. Create a project at https://supabase.com
2. Go to SQL Editor, paste the contents of `supabase-schema.sql`, run it
3. Go to Project Settings > API, copy the Project URL and anon public key into `.env.local`
4. Go to Authentication > Providers, confirm Email is enabled (magic link is on by default)
5. Go to Authentication > URL Configuration, add your production URL (https://putterlist.com) and localhost:5173 to the redirect allow list

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com, "Add New Project", import the GitHub repo
3. Vercel auto-detects Vite. Before deploying, add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. Go to Project Settings > Domains, add `putterlist.com`, follow the DNS instructions Vercel gives you (usually an A record or CNAME at your registrar)
6. Add the same production URL back into Supabase's redirect allow list once the domain is live
