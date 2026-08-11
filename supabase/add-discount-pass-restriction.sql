-- Restrict a discount code to a single pass type (e.g. drop-in/casual only)
-- null = applies to all pass types
alter table public.discount_codes
  add column if not exists applicable_pass_type text;
