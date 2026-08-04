-- Lets a one-off class (a pop-up, collab, or guest class at a different location/date
-- outside the regular recurring schedule) be flagged and labeled so it stands out
-- on the booking page instead of blending in with the regular weekly classes.

alter table public.classes add column is_special boolean not null default false;
alter table public.classes add column special_label text;
