# THE A.M Dance Club – Setup Guide

## Prerequisites
- Node.js 18+ installed (download from nodejs.org)
- A Supabase account (free at supabase.com)
- Your existing Stripe account

---

## Step 1: Install dependencies

```bash
cd am-dance-club
npm install
```

---

## Step 2: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your project dashboard, go to **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`
4. Go to **Settings → API** and copy:
   - Project URL
   - anon/public key

---

## Step 3: Set up environment variables

Copy the example file:
```bash
cp .env.example .env.local
```

Fill in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_INSTRUCTOR_EMAIL=your@email.com
```

---

## Step 4: Get Stripe keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** and **Secret key** (use test mode to start)
3. For the webhook secret:
   - Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
   - Run: `stripe login`
   - Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Copy the webhook signing secret it prints

---

## Step 5: Make yourself instructor

After signing up with your email:
1. Go to Supabase → Table Editor → profiles
2. Find your row and change `role` from `student` to `instructor`

---

## Step 6: Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all environment variables from `.env.local`
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Update Stripe webhook URL to `https://your-app.vercel.app/api/stripe/webhook`

---

## Features

| Feature | Where |
|---|---|
| Create classes | Instructor Dashboard → New Class |
| Mark attendance | Instructor Dashboard → Attendance tab |
| Add recordings | Instructor Dashboard → + Add Recording |
| Book a class | Classes page → Book Now |
| View bookings | My Classes (student dashboard) |
| Watch recordings | Recordings page |

---

## Colors & Fonts

- Pink: `#e4c3cc` / `#e5c3cb`
- Blue: `#2041d8` / `#a3bdfe`
- Cream: `#fff8f3`
- Fonts: Archivo Black (headings) + Space Grotesk (body)
