-- The chat UI already lets a sender edit their own message body, but no RLS
-- policy ever allowed that update, so edits were silently discarded (client
-- state updated locally, nothing persisted). This adds it, plus the delete
-- policy needed for the "delete my own message" button.

create policy "Users can edit their own messages" on public.messages
  for update using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "Users can delete their own messages" on public.messages
  for delete using (auth.uid() = sender_id);
