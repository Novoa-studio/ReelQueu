-- =============================================================================
-- ReelQueue · schéma initial
--
-- À exécuter une fois : Supabase › SQL Editor › New query › coller › Run.
-- (ou `supabase db push` avec la CLI liée au projet)
-- Le script est rejouable : il peut être relancé sans erreur.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profils : une ligne par utilisateur, créée automatiquement à l'inscription
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

-- Comptes créés avant cette migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Vidéos (des liens : rien n'est téléchargé ni hébergé)
-- -----------------------------------------------------------------------------
create table if not exists public.videos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  url           text not null check (char_length(url) between 1 and 2048),
  canonical_url text not null check (char_length(canonical_url) between 1 and 2048),
  platform      text not null default 'other'
                check (platform in ('instagram', 'tiktok', 'youtube', 'facebook', 'x', 'vimeo', 'other')),
  title         text check (char_length(title) <= 500),
  thumbnail_url text check (char_length(thumbnail_url) <= 2048),
  creator       text check (char_length(creator) <= 200),
  status        text not null default 'pending'
                check (status in ('pending', 'viewed', 'archived')),
  is_favorite   boolean not null default false,
  note          text check (char_length(note) <= 2000),
  added_at      timestamptz not null default now(),
  opened_at     timestamptz,
  viewed_at     timestamptz,
  updated_at    timestamptz not null default now(),
  -- Anti-doublon : une même vidéo (URL normalisée) une seule fois par utilisateur.
  constraint videos_user_canonical_url_key unique (user_id, canonical_url)
);

create index if not exists videos_user_status_added_idx
  on public.videos (user_id, status, added_at desc);
create index if not exists videos_user_favorite_idx
  on public.videos (user_id) where is_favorite;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Collections et liaison vidéos ↔ collections (plusieurs par vidéo)
-- -----------------------------------------------------------------------------
create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  color      text not null default 'gray'
             check (color in ('gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink')),
  created_at timestamptz not null default now()
);

create unique index if not exists collections_user_name_key
  on public.collections (user_id, lower(btrim(name)));

create table if not exists public.video_collections (
  video_id      uuid not null references public.videos (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (video_id, collection_id)
);

create index if not exists video_collections_collection_id_idx
  on public.video_collections (collection_id);

-- -----------------------------------------------------------------------------
-- Row Level Security : chacun n'accède qu'à ses propres données
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.videos            enable row level security;
alter table public.collections       enable row level security;
alter table public.video_collections enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- videos
drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own" on public.videos
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own" on public.videos
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "videos_update_own" on public.videos;
create policy "videos_update_own" on public.videos
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "videos_delete_own" on public.videos;
create policy "videos_delete_own" on public.videos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- collections
drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own" on public.collections
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own" on public.collections
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own" on public.collections
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own" on public.collections
  for delete to authenticated using ((select auth.uid()) = user_id);

-- video_collections : la vidéo ET la collection doivent appartenir à l'utilisateur
drop policy if exists "video_collections_select_own" on public.video_collections;
create policy "video_collections_select_own" on public.video_collections
  for select to authenticated using (
    exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid()))
  );

drop policy if exists "video_collections_insert_own" on public.video_collections;
create policy "video_collections_insert_own" on public.video_collections
  for insert to authenticated with check (
    exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid()))
    and exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid()))
  );

drop policy if exists "video_collections_delete_own" on public.video_collections;
create policy "video_collections_delete_own" on public.video_collections
  for delete to authenticated using (
    exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- Classement atomique d'une vidéo dans un ensemble de collections
-- (security invoker : la RLS de l'appelant s'applique)
-- -----------------------------------------------------------------------------
create or replace function public.set_video_collections(p_video_id uuid, p_collection_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ids uuid[] := coalesce(p_collection_ids, '{}');
begin
  if not exists (
    select 1 from public.videos where id = p_video_id and user_id = (select auth.uid())
  ) then
    raise exception 'video_not_found' using errcode = 'P0002';
  end if;

  delete from public.video_collections
  where video_id = p_video_id
    and not (collection_id = any (ids));

  insert into public.video_collections (video_id, collection_id)
  select p_video_id, c.id
  from public.collections c
  where c.id = any (ids) and c.user_id = (select auth.uid())
  on conflict do nothing;
end;
$$;

-- -----------------------------------------------------------------------------
-- Droits : rien pour les visiteurs anonymes, le strict nécessaire pour les connectés
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.videos, public.collections, public.video_collections from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.videos, public.collections to authenticated;
grant select, insert, delete on public.video_collections to authenticated;

revoke execute on function public.set_video_collections(uuid, uuid[]) from public, anon;
grant execute on function public.set_video_collections(uuid, uuid[]) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
