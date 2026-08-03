-- The classes.duration_minutes column has always defaulted to 60, but this business's
-- actual class length is 45 minutes. No form ever exposed this field for editing, so every
-- existing class row is sitting at the wrong default (60) rather than the real value (45).
-- This corrects existing rows and changes the default so future classes start correct.

update public.classes set duration_minutes = 45 where duration_minutes = 60;

alter table public.classes alter column duration_minutes set default 45;
