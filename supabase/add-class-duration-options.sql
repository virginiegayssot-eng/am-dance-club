-- Optional second duration/price tier per class (e.g. Sneakers: 60min $25 or 90min $30)
-- Null on both columns means the class only offers its single default duration_minutes/price_cents.

alter table public.classes add column alt_duration_minutes int;
alter table public.classes add column alt_price_cents int;
