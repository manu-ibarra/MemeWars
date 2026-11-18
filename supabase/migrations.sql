-- MEME WARS schema. Safe to run more than once.
create extension if not exists pgcrypto;

-- Code is "MEME-XXXX" (9 chars) so the column is varchar(10)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code varchar(10) unique not null,
  host_id uuid,
  status varchar default 'lobby',  -- lobby, playing, voting, finished
  settings jsonb default '{"rounds":5,"timePerRound":60,"clipSource":"host_only"}',
  current_round int default 0,
  current_meme_id uuid,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  nickname varchar(20) not null,
  avatar_color varchar(20),
  avatar_emoji varchar(5),
  score int default 0,
  is_host boolean default false,
  is_ready boolean default false,
  joined_at timestamptz default now()
);

create table if not exists memes (
  id uuid primary key default gen_random_uuid(),
  title varchar(100),
  media_url text not null,
  thumbnail_url text,
  type varchar,                     -- image, video, gif
  duration_seconds int,
  tags text[],
  is_active boolean default true,
  default_text_positions jsonb default '{"top":{"x":50,"y":8},"bottom":{"x":50,"y":88}}',
  created_by varchar default 'admin',
  created_at timestamptz default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  round_number int,
  meme_id uuid references memes(id) on delete set null,
  phase varchar default 'writing',  -- writing, voting, results
  ends_at timestamptz,
  voting_index int default 0,       -- which submission is being voted right now
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  top_text text,
  bottom_text text,
  text_layers jsonb,
  rendered_image_url text,
  created_at timestamptz default now(),
  unique (round_id, player_id)
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  voter_id uuid references players(id) on delete cascade,
  points int check (points in (0,1,2)),
  created_at timestamptz default now(),
  unique (submission_id, voter_id)
);

create index if not exists players_room_idx on players(room_id);
create index if not exists rounds_room_idx on rounds(room_id);
create index if not exists subs_round_idx on submissions(round_id);
create index if not exists votes_sub_idx on votes(submission_id);

-- Server clock, used by clients to avoid timer desync
create or replace function server_now() returns timestamptz
language sql stable as $$ select clock_timestamp() $$;

-- RLS: permissive for anonymous play (MVP: the room code is the only "auth")
alter table rooms enable row level security;
alter table players enable row level security;
alter table memes enable row level security;
alter table rounds enable row level security;
alter table submissions enable row level security;
alter table votes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['rooms','players','rounds','submissions','votes'] loop
    execute format('drop policy if exists "open_all" on %I', t);
    execute format('create policy "open_all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- memes: anyone reads, only the service role (admin API) writes
drop policy if exists "memes_read" on memes;
create policy "memes_read" on memes for select using (true);

-- Realtime
alter table players replica identity full;
alter table rooms replica identity full;
do $$
declare t text;
begin
  foreach t in array array['rooms','players','rounds','submissions','votes'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Seed: 6 example memes so the game can be tested right away
insert into memes (title, media_url, thumbnail_url, type, tags)
select * from (values
  ('Ejemplo 1','https://picsum.photos/seed/memewars1/960/540','https://picsum.photos/seed/memewars1/320/180','image',array['ejemplo']),
  ('Ejemplo 2','https://picsum.photos/seed/memewars2/960/540','https://picsum.photos/seed/memewars2/320/180','image',array['ejemplo']),
  ('Ejemplo 3','https://picsum.photos/seed/memewars3/960/540','https://picsum.photos/seed/memewars3/320/180','image',array['ejemplo']),
  ('Ejemplo 4','https://picsum.photos/seed/memewars4/960/540','https://picsum.photos/seed/memewars4/320/180','image',array['ejemplo']),
  ('Ejemplo 5','https://picsum.photos/seed/memewars5/960/540','https://picsum.photos/seed/memewars5/320/180','image',array['ejemplo']),
  ('Ejemplo 6','https://picsum.photos/seed/memewars6/960/540','https://picsum.photos/seed/memewars6/320/180','image',array['ejemplo'])
) as v(title,media_url,thumbnail_url,type,tags)
where not exists (select 1 from memes);
