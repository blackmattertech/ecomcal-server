# Tag Fees — Server

Express API for marketplace fee calculation. Works with local fee seed or Supabase.

## Local

```bash
cp .env.example .env   # optional Supabase keys
npm install
npm run dev
```

API: `http://localhost:4000`

- `GET /api/health`
- `GET /api/meta`
- `POST /api/calculate`

## Go live

Deploy this repo on **Render**, **Railway**, or **Fly.io**.

### Render example

1. New → Web Service → connect `blackmattertech/ecomcal-server`
2. Build: `npm install`
3. Start: `npm start`
4. Env (optional):

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `PORT` | Set automatically by most hosts |

5. After deploy, set that URL as `VITE_API_URL` on the client.

CORS is open (`cors()`), so the Vercel/Netlify client can call this API.

## Supabase (optional)

Run in order:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_seed_amazon.sql`
