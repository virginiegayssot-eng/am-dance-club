-- The webhook and manual "assign pass" routes have always inserted a
-- `source` and `amount_paid_cents` value on every pass, and Reports has
-- always read them back (payment-type breakdown, revenue totals), but
-- passes-schema.sql never actually defined these columns. Every pass
-- insert that included them was silently failing (Postgres rejects an
-- insert referencing an unknown column), so no pass ever got created,
-- even though the webhook still returned 200 to Stripe.

alter table public.passes
  add column if not exists source text,
  add column if not exists amount_paid_cents int;
