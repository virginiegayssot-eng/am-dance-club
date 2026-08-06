# Setup Guide

This is a template — the code is generic, but every new client install needs its
own Supabase project, Stripe account, and Resend sender. Follow these steps in
order.

## Prerequisites
- Node.js 18+ installed (download from nodejs.org)
- A Supabase account (free at supabase.com)
- A Stripe account
- A Resend account (free at resend.com) for transactional email

---

## Step 1: Install dependencies

```bash
npm install
```

---

## Step 2: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your project dashboard, go to **SQL Editor** and run each of these files
   **in this exact order** (each one depends on tables created by the ones
   before it):
   1. `supabase/schema.sql`
   2. `supabase/passes-schema.sql`
   3. `supabase/chat-profile-schema.sql`
   4. `supabase/add-playlists-discounts-walkins.sql`
   5. `supabase/add-news-and-likes.sql`
   6. `supabase/add-special-class-flag.sql`
   7. `supabase/add-class-duration-options.sql`
   8. `supabase/add-merch.sql`
   9. `supabase/add-chat-image-support.sql`
   10. `supabase/add-news-post-image.sql`
3. Go to **Storage** and create three **public** buckets:
   - `avatars`
   - `chat-images`
   - `news-images`
4. Go to **Settings → API** and copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (needed for admin-only API routes — keep this out of client code)

---

## Step 3: Set up environment variables

Copy the example file:
```bash
cp .env.example .env.local
```

Fill in every value in `.env.local` — see the comments in `.env.example` for
where each one comes from (Supabase, Stripe, Resend).

---

## Step 4: Get Stripe keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key** (use test mode to start)
3. For the webhook secret, for local development:
   - Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
   - Run: `stripe login`
   - Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Copy the webhook signing secret it prints
   - In production, add a webhook endpoint in the Stripe dashboard pointing at
     `https://your-domain.com/api/stripe/webhook` instead

---

## Step 5: Set up Resend

1. Go to [resend.com](https://resend.com), create an account, and verify a
   sending domain (or use their test sender while developing)
2. Create an API key and set `RESEND_API_KEY`
3. Set `RESEND_FROM` to a verified sender address on that domain

---

## Step 6: Make yourself instructor

Instructor access is a database role, not tied to any environment variable:
1. Sign up for an account in the app with your own email
2. In Supabase, go to **Table Editor → profiles**
3. Find your row and change `role` from `student` to `instructor`

---

## Step 7: Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 8: Replace the placeholder branding

Search the codebase for `[Studio Name]`, `[Studio Location]`, `[Schedule]`,
`[Price]`, `[Studio Email]`, `[Instructor Name]`, `[WhatsApp group invite URL]`,
`[Website URL]`, `[Instagram URL]`, and `[Shop merch URL]` — swap each for the
real client's details. Also replace `public/logo.png`,
`public/logo-transparent.png`, `public/apple-touch-icon.png`,
`public/icon-192.png`, and `public/icon-512.png` with the client's real logo
artwork (same filenames and dimensions), and update `public/manifest.json`'s
`name`/`short_name`/`description`.

`supabase/add-merch.sql` seeds one example "Studio T-Shirt" product so
`/merch` isn't empty — edit or delete it from the instructor dashboard's Merch
tab once real products are ready.

---

## Deploy

1. Push to GitHub
2. Import the repo into your hosting provider of choice (Vercel or Netlify
   both work with zero config for Next.js)
3. Add every environment variable from `.env.local`
4. Change `NEXT_PUBLIC_APP_URL` to the deployed URL
5. Update the Stripe webhook endpoint to point at
   `https://your-domain.com/api/stripe/webhook`

---

## Features

| Feature | Where |
|---|---|
| Create classes | Instructor Dashboard → New Class |
| Mark attendance | Instructor Dashboard → Attendance tab |
| Add recordings | Instructor Dashboard → + Add Recording |
| Manage merch products | Instructor Dashboard → Merch tab |
| Book a class | Classes page → Book Now |
| View bookings | My Classes (student dashboard) |
| Watch recordings | Videos page |
| Buy merch | Merch page |

---

## Colors & Fonts

- Primary: `#334155` / `#94a3b8`
- Accent: `#e2e8f0` / `#cbd5e1`
- Surface: `#f8fafc`
- Fonts: Archivo Black (headings) + Space Grotesk (body)

Swap these hex values throughout the codebase for the client's real brand
colors once you have them.
