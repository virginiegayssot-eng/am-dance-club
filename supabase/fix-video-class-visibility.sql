-- The "Visible to all members" checkbox on a video implied that leaving it
-- unchecked would restrict the video to students who attended the linked
-- class ("not just paid registrants"). The actual RLS policy never had that
-- exception: it only checked is_public, so an unchecked video was invisible
-- to every student, including people who attended the linked class, and the
-- "Link to Class" field was purely a label with no visibility effect.
--
-- Add the missing exception: a student who attended the linked class can see
-- the video even when is_public is false. Nothing else changes — is_public
-- still makes a video visible to every member regardless of class.

drop policy if exists "Public videos visible to all authenticated users" on public.videos;

create policy "Public videos visible to all authenticated users" on public.videos
  for select using (
    is_public = true
    or auth.uid() in (select id from public.profiles where role = 'instructor')
    or (
      class_id is not null
      and exists (
        select 1 from public.attendance
        where attendance.class_id = videos.class_id
          and attendance.student_id = auth.uid()
          and attendance.attended = true
      )
    )
  );
