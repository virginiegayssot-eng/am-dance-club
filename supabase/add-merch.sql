-- Merch: products + orders (direct per-client Stripe, no Connect)

create table public.merch_products (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  price_cents int not null,
  image_url text,
  sizes text[],
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.merch_products enable row level security;
create policy "Active products viewable by authenticated users" on public.merch_products
  for select using (auth.role() = 'authenticated' and active = true);
create policy "Instructors can view all products" on public.merch_products
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );
create policy "Instructors can manage products" on public.merch_products
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

create table public.merch_orders (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.merch_products(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,
  size text,
  amount_paid_cents int,
  stripe_session_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz default now()
);

alter table public.merch_orders enable row level security;
create policy "Students view own orders" on public.merch_orders
  for select using (auth.uid() = student_id);
create policy "Students create own orders" on public.merch_orders
  for insert with check (auth.uid() = student_id);
create policy "Instructors view all orders" on public.merch_orders
  for select using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

-- Example product so /merch isn't empty out of the box — edit or delete
-- this from the instructor dashboard's Merch tab once real products are ready.
insert into public.merch_products (title, description, price_cents, sizes, active) values
  ('BYLA Tee', 'Soft cotton tee with the BYLA logo. Example product — edit me from the instructor dashboard.', 3500, array['S', 'M', 'L', 'XL'], true);
