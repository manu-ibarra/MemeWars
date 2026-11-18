-- Storage bucket "meme-clips": public read.
-- Admin uploads go through /api/upload (service role, password protected).
-- Players may only write rendered memes under renders/.
insert into storage.buckets (id, name, public, file_size_limit)
values ('meme-clips', 'meme-clips', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "meme_clips_read" on storage.objects;
create policy "meme_clips_read" on storage.objects
  for select using (bucket_id = 'meme-clips');

drop policy if exists "meme_clips_render_write" on storage.objects;
create policy "meme_clips_render_write" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'meme-clips' and name like 'renders/%');

drop policy if exists "meme_clips_render_update" on storage.objects;
create policy "meme_clips_render_update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'meme-clips' and name like 'renders/%');
