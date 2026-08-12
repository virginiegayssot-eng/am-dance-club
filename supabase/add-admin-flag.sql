-- An admin is still a regular instructor (role stays 'instructor') that
-- additionally gets this flag, unlocking revenue reports, discount codes,
-- deleting classes they don't own, editing other instructors' bios, and
-- merch catalog management. Because admins keep role = 'instructor',
-- every existing "instructor" query (public bios page, class assignment,
-- chat, "w/ Name" labels, member/pass management, etc.) keeps working for
-- them unchanged — this flag only gates the handful of admin-exclusive
-- actions below.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Discount codes: admin-only from here on (was any instructor).
drop policy if exists "Instructors can manage discount codes" on public.discount_codes;
create policy "Admins can manage discount codes" on public.discount_codes
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true)
  );

-- Merch products: any instructor can still view the catalog (existing
-- "Instructors can view all products" policy is untouched); only admins
-- can add/hide/delete products from here on.
drop policy if exists "Instructors can manage products" on public.merch_products;
create policy "Admins can manage products" on public.merch_products
  for all using (
    auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true)
  );

-- Classes: any instructor can still view/create/edit any class (so they
-- can cover for each other), but only the owning instructor (either slot)
-- or an admin can delete one.
drop policy if exists "Instructors can manage classes" on public.classes;

create policy "Instructors can insert classes" on public.classes
  for insert with check (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

create policy "Instructors can update classes" on public.classes
  for update using (
    auth.uid() in (select id from public.profiles where role = 'instructor')
  );

create policy "Owning instructor or admin can delete classes" on public.classes
  for delete using (
    auth.uid() = instructor_id or auth.uid() = instructor_id_2 or
    auth.uid() in (select id from public.profiles where role = 'instructor' and is_admin = true)
  );
