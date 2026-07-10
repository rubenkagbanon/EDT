-- EDT Manager: schema initial multi-etablissements
-- Voir Source/README.md et le plan pour le contexte metier.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Etablissements & profils
-- ---------------------------------------------------------------------------

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_type text not null check (school_type in ('college', 'lycee', 'college_lycee')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  establishment_id uuid references public.establishments(id) on delete cascade,
  role text check (role in ('admin', 'scheduler', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Helper functions used throughout RLS policies. security definer so they can
-- read profiles without re-triggering RLS recursively.
create function public.current_establishment_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select establishment_id from public.profiles where id = auth.uid()
$$;

create function public.current_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Auto-create a bare profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a non-admin from re-assigning their own establishment/role once the
-- initial onboarding bootstrap (establishment_id: null -> value) has happened.
create function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.establishment_id is not null
     and (new.role is distinct from old.role or new.establishment_id is distinct from old.establishment_id)
     and coalesce(public.current_role(), '') <> 'admin' then
    raise exception 'Seul un administrateur peut modifier le role ou l''etablissement.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Configuration etablissement
-- ---------------------------------------------------------------------------

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  label text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.time_slots (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  kind text not null check (kind in ('cours', 'recreation', 'dejeuner', 'banalise')),
  order_index integer not null,
  unique (establishment_id, day_of_week, order_index)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  name text not null,
  room_type text not null check (room_type in ('salle_principale', 'laboratoire', 'polyvalente', 'terrain', 'autre')),
  capacity integer,
  priority_note text,
  unique (establishment_id, name)
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  name text not null,
  cycle text not null check (cycle in ('college', 'lycee')),
  order_index integer not null default 0,
  unique (establishment_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  level_id uuid not null references public.levels(id) on delete cascade,
  name text not null,
  headcount integer,
  unique (establishment_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  code text not null,
  name text not null,
  subject_group text not null check (subject_group in ('langues', 'sciences', 'autre')),
  unique (establishment_id, code)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  full_name text not null,
  max_weekly_hours numeric not null default 0
);

create table public.teacher_subjects (
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (teacher_id, subject_id)
);

create table public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  weekly_hours numeric not null default 0,
  unique (class_id, subject_id)
);

-- ---------------------------------------------------------------------------
-- Groupes pedagogiques (cours normal / tronc commun / tandem / LV2)
-- ---------------------------------------------------------------------------

create table public.teaching_groups (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  label text not null,
  session_slot_lengths integer[] not null default '{}',
  paired_group_id uuid references public.teaching_groups(id) on delete set null
);

create table public.teaching_group_classes (
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  group_id uuid not null references public.teaching_groups(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (group_id, class_id)
);

create table public.teaching_group_teachers (
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  group_id uuid not null references public.teaching_groups(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  primary key (group_id, teacher_id)
);

-- ---------------------------------------------------------------------------
-- Placements manuels sur la grille
-- ---------------------------------------------------------------------------

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teaching_group_id uuid not null references public.teaching_groups(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_slot_order integer not null,
  slot_count integer not null default 1 check (slot_count > 0),
  room_id uuid references public.rooms(id) on delete set null
);

create index schedule_entries_room_lookup
  on public.schedule_entries (establishment_id, academic_year_id, day_of_week, room_id);

create extension if not exists btree_gist;

-- Empeche deux placements de se chevaucher dans la meme salle.
alter table public.schedule_entries
  add constraint schedule_entries_room_no_overlap
  exclude using gist (
    establishment_id with =,
    academic_year_id with =,
    day_of_week with =,
    room_id with =,
    int4range(start_slot_order, start_slot_order + slot_count) with &&
  ) where (room_id is not null);

create function public.check_schedule_conflicts()
returns trigger
language plpgsql as $$
declare
  conflict_count integer;
begin
  -- Conflit enseignant : meme professeur, plage de creneaux chevauchante,
  -- sur un autre groupe pedagogique.
  select count(*) into conflict_count
  from public.schedule_entries se
  join public.teaching_group_teachers tgt on tgt.group_id = se.teaching_group_id
  where se.id <> new.id
    and se.establishment_id = new.establishment_id
    and se.academic_year_id = new.academic_year_id
    and se.day_of_week = new.day_of_week
    and se.teaching_group_id <> new.teaching_group_id
    and int4range(se.start_slot_order, se.start_slot_order + se.slot_count)
        && int4range(new.start_slot_order, new.start_slot_order + new.slot_count)
    and tgt.teacher_id in (
      select teacher_id from public.teaching_group_teachers where group_id = new.teaching_group_id
    );

  if conflict_count > 0 then
    raise exception 'Conflit : un enseignant de ce cours est deja affecte sur ce creneau.';
  end if;

  -- Conflit classe : meme classe, plage de creneaux chevauchante, sur un
  -- autre groupe pedagogique.
  select count(*) into conflict_count
  from public.schedule_entries se
  join public.teaching_group_classes tgc on tgc.group_id = se.teaching_group_id
  where se.id <> new.id
    and se.establishment_id = new.establishment_id
    and se.academic_year_id = new.academic_year_id
    and se.day_of_week = new.day_of_week
    and se.teaching_group_id <> new.teaching_group_id
    and int4range(se.start_slot_order, se.start_slot_order + se.slot_count)
        && int4range(new.start_slot_order, new.start_slot_order + new.slot_count)
    and tgc.class_id in (
      select class_id from public.teaching_group_classes where group_id = new.teaching_group_id
    );

  if conflict_count > 0 then
    raise exception 'Conflit : une classe de ce cours a deja un cours sur ce creneau.';
  end if;

  return new;
end;
$$;

create trigger check_schedule_conflicts_trigger
  before insert or update on public.schedule_entries
  for each row execute function public.check_schedule_conflicts();

-- ---------------------------------------------------------------------------
-- Rapport d'arbitrage
-- ---------------------------------------------------------------------------

create table public.arbitration_notes (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  schedule_entry_id uuid references public.schedule_entries(id) on delete cascade,
  rule_code text not null,
  message text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.establishments enable row level security;
alter table public.profiles enable row level security;
alter table public.academic_years enable row level security;
alter table public.time_slots enable row level security;
alter table public.rooms enable row level security;
alter table public.levels enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.teaching_groups enable row level security;
alter table public.teaching_group_classes enable row level security;
alter table public.teaching_group_teachers enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.arbitration_notes enable row level security;

-- establishments
create policy establishments_select on public.establishments
  for select using (id = public.current_establishment_id());
create policy establishments_insert on public.establishments
  for insert with check (created_by = auth.uid());
create policy establishments_update on public.establishments
  for update using (id = public.current_establishment_id() and public.current_role() = 'admin')
  with check (id = public.current_establishment_id());

-- profiles
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or establishment_id = public.current_establishment_id());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_update on public.profiles
  for update using (public.current_role() = 'admin' and establishment_id = public.current_establishment_id())
  with check (establishment_id = public.current_establishment_id());

-- Generic pattern for tenant-scoped operational tables: readable by anyone in
-- the establishment, writable by admin/scheduler only.
do $$
declare
  t text;
begin
  foreach t in array array[
    'academic_years', 'time_slots', 'rooms', 'levels', 'classes', 'subjects',
    'teachers', 'teacher_subjects', 'curriculum_items', 'teaching_groups',
    'teaching_group_classes', 'teaching_group_teachers', 'schedule_entries',
    'arbitration_notes'
  ]
  loop
    execute format(
      'create policy %1$s_select on public.%1$s for select using (establishment_id = public.current_establishment_id());',
      t
    );
    execute format(
      'create policy %1$s_write on public.%1$s for all using (establishment_id = public.current_establishment_id() and public.current_role() in (''admin'', ''scheduler'')) with check (establishment_id = public.current_establishment_id() and public.current_role() in (''admin'', ''scheduler''));',
      t
    );
  end loop;
end $$;
