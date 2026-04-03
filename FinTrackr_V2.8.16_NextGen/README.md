# RaswiBudgeting (Cloud + Accounts)

This is a Vite + React + Supabase budget app (Netlify-ready).

## Local run
1) `npm i`
2) Create `.env` in the project root:
```
VITE_SUPABASE_URL=YOUR_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
3) `npm run dev`

## Deploy to Netlify
- Import from Git OR drag-drop after `npm run build`
- Set the same env vars in Netlify:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Supabase SQL (run in SQL editor)
See `supabase/schema.sql`
