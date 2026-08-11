-- Lets a class have a second instructor assigned (co-teaching).
alter table public.classes
  add column if not exists instructor_id_2 uuid references public.profiles(id);
