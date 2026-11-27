-- =============================================================================
-- ReelQueue · clés d'ajout pour le Raccourci iOS (partage depuis Instagram)
--
-- À exécuter APRÈS 20261125120000_initial_schema.sql (SQL Editor › Run).
-- Rejouable sans erreur.
--
-- Principe : l'utilisateur génère une clé dans l'app ; seule son empreinte
-- SHA-256 est stockée. Le Raccourci envoie le lien et la clé à /api/share,
-- qui appelle add_shared_video : la fonction retrouve l'utilisateur par
-- l'empreinte et enregistre la vidéo pour lui. Aucune clé secrète Supabase
-- n'est nécessaire côté serveur.
-- =============================================================================

create table if not exists public.share_tokens (
  -- Une seule clé active par utilisateur : en recréer une remplace la précédente.
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.share_tokens enable row level security;

drop policy if exists "share_tokens_select_own" on public.share_tokens;
create policy "share_tokens_select_own" on public.share_tokens
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "share_tokens_delete_own" on public.share_tokens;
create policy "share_tokens_delete_own" on public.share_tokens
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.share_tokens from anon;
grant select, delete on public.share_tokens to authenticated;

-- -----------------------------------------------------------------------------
-- Créer ou remplacer sa clé (appelée par l'app, utilisateur connecté)
-- -----------------------------------------------------------------------------
create or replace function public.rotate_share_token(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token_hash' using errcode = '22023';
  end if;
  insert into public.share_tokens (user_id, token_hash)
  values (uid, p_token_hash)
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = now(), last_used_at = null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ajout d'une vidéo avec une clé (appelée par /api/share, sans session)
-- Renvoie { status: added | duplicate | requeued | invalid_token, ... }
-- -----------------------------------------------------------------------------
create or replace function public.add_shared_video(
  p_token_hash    text,
  p_url           text,
  p_canonical_url text,
  p_platform      text,
  p_title         text default null,
  p_creator       text default null,
  p_thumbnail_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid;
  v_existing public.videos%rowtype;
  v_id       uuid;
begin
  select user_id into v_user from public.share_tokens where token_hash = p_token_hash;
  if v_user is null then
    return jsonb_build_object('status', 'invalid_token');
  end if;

  update public.share_tokens set last_used_at = now() where user_id = v_user;

  select * into v_existing
  from public.videos
  where user_id = v_user and canonical_url = p_canonical_url;

  if found then
    -- Partager à nouveau une vidéo déjà vue : on la remet dans « À regarder ».
    if v_existing.status <> 'pending' then
      update public.videos set status = 'pending', viewed_at = null where id = v_existing.id;
      return jsonb_build_object('status', 'requeued', 'id', v_existing.id, 'title', v_existing.title);
    end if;
    return jsonb_build_object('status', 'duplicate', 'id', v_existing.id, 'title', v_existing.title);
  end if;

  insert into public.videos (user_id, url, canonical_url, platform, title, creator, thumbnail_url)
  values (v_user, p_url, p_canonical_url, p_platform, p_title, p_creator, p_thumbnail_url)
  on conflict (user_id, canonical_url) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;
  return jsonb_build_object('status', 'added', 'id', v_id);
end;
$$;

revoke execute on function public.rotate_share_token(text) from public, anon;
grant execute on function public.rotate_share_token(text) to authenticated;

-- Appelée sans session : c'est la clé (256 bits aléatoires) qui authentifie.
revoke execute on function public.add_shared_video(text, text, text, text, text, text, text) from public;
grant execute on function public.add_shared_video(text, text, text, text, text, text, text) to anon, authenticated;
