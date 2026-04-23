# Kobi Business OS v2.0

## Overview
Universal Business Platform with 50,945+ modules across 245 categories.

## Tech Stack
- **Frontend**: React 19 + Vite 6 + TailwindCSS 4 + Zustand + Wouter
- **Backend**: Express.js + Supabase Edge Functions
- **Database**: Supabase (PostgreSQL) with RLS
- **AI**: Multi-provider AI Builder (OpenAI, Anthropic, Gemini)
- **Languages**: Hebrew (RTL), English, Arabic

## Running
```bash
npm install
npm run dev
```

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server only)
