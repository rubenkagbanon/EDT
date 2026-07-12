-- Suppression des groupes pedagogiques : un prof declare desormais ses matieres
-- (teacher_subjects, deja existant) et ses niveaux (teacher_levels, nouveau).
-- Le placement (schedule_entries) reference directement subject_id/teacher_id ;
-- schedule_entry_classes remplace teaching_group_classes (tronc commun = >1 classe
-- sur la meme entree) ; paired_entry_id remplace paired_group_id (tandem/LV2).
-- Ajoute aussi les reglages avances par etablissement et les indisponibilites profs.

-- ---------------------------------------------------------------------------
-- Nettoyage : anciens triggers/fonctions lies aux groupes
-- ---------------------------------------------------------------------------

drop trigger if exists sync_paired_group_trigger on public.teaching_groups;
drop function if exists public.sync_paired_group();
drop trigger if exists check_schedule_conflicts_trigger on public.schedule_entries;
drop function if exists public.check_schedule_conflicts();

-- ---------------------------------------------------------------------------
-- schedule_entries : teaching_group_id -> subject_id + teacher_id + paired_entry_id
-- ---------------------------------------------------------------------------

alter table public.schedule_entries drop column teaching_group_id;

alter table public.schedule_entries
  add column subject_id uuid references public.subjects(id) on delete cascade,
  add column teacher_id uuid references public.teachers(id) on delete cascade,
  add column paired_entry_id uuid references public.schedule_entries(id) on delete set null;

alter table public.schedule_entries
  alter column subject_id set not null,
  alter column teacher_id set not null;

-- ---------------------------------------------------------------------------
-- Suppression des tables de groupes
-- ---------------------------------------------------------------------------

drop table public.teaching_group_teachers;
drop table public.teaching_group_classes;
drop table public.teaching_groups;

-- ---------------------------------------------------------------------------
-- schedule_entry_classes (remplace teaching_group_classes)
-- ---------------------------------------------------------------------------

create table public.schedule_entry_classes (
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  entry_id uuid not null references public.schedule_entries(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (entry_id, class_id)
);

-- ---------------------------------------------------------------------------
-- teacher_levels (miroir de teacher_subjects)
-- ---------------------------------------------------------------------------

create table public.teacher_levels (
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  level_id uuid not null references public.levels(id) on delete cascade,
  primary key (teacher_id, level_id)
);

-- ---------------------------------------------------------------------------
-- teacher_unavailability
-- ---------------------------------------------------------------------------

create table public.teacher_unavailability (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null default public.current_establishment_id()
    references public.establishments(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  order_index integer not null,
  unique (teacher_id, day_of_week, order_index)
);

-- ---------------------------------------------------------------------------
-- establishment_settings (reglages avances, 1 ligne par etablissement)
-- ---------------------------------------------------------------------------

create table public.establishment_settings (
  establishment_id uuid primary key references public.establishments(id) on delete cascade,
  grille_stricte boolean not null default true,
  etaler boolean not null default true,
  max_meme_matiere_jour integer not null default 2,
  lourdes_matin boolean not null default true,
  matieres_lourdes uuid[] not null default '{}',
  respecter_indispos boolean not null default true
);

create function public.handle_new_establishment_settings()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.establishment_settings (establishment_id) values (new.id);
  return new;
end;
$$;

create trigger on_establishment_created
  after insert on public.establishments
  for each row execute function public.handle_new_establishment_settings();

-- Retro-compatibilite : etablissements deja crees avant cette migration.
insert into public.establishment_settings (establishment_id)
select id from public.establishments
on conflict (establishment_id) do nothing;

-- ---------------------------------------------------------------------------
-- Triggers de conflit (remplacent check_schedule_conflicts)
-- ---------------------------------------------------------------------------

create function public.check_teacher_conflict()
returns trigger
language plpgsql set search_path = public as $$
declare
  conflict_count integer;
begin
  select count(*) into conflict_count
  from public.schedule_entries se
  where se.id <> new.id
    and se.establishment_id = new.establishment_id
    and se.academic_year_id = new.academic_year_id
    and se.day_of_week = new.day_of_week
    and se.teacher_id = new.teacher_id
    and int4range(se.start_slot_order, se.start_slot_order + se.slot_count)
        && int4range(new.start_slot_order, new.start_slot_order + new.slot_count);

  if conflict_count > 0 then
    raise exception 'Conflit : cet enseignant est deja affecte sur ce creneau.';
  end if;

  return new;
end;
$$;

create trigger check_teacher_conflict_trigger
  before insert or update on public.schedule_entries
  for each row execute function public.check_teacher_conflict();

create function public.check_class_conflict()
returns trigger
language plpgsql set search_path = public as $$
declare
  conflict_count integer;
  entry_row public.schedule_entries;
begin
  select * into entry_row from public.schedule_entries where id = new.entry_id;

  select count(*) into conflict_count
  from public.schedule_entries se
  join public.schedule_entry_classes sec on sec.entry_id = se.id
  where se.id <> entry_row.id
    and se.establishment_id = entry_row.establishment_id
    and se.academic_year_id = entry_row.academic_year_id
    and se.day_of_week = entry_row.day_of_week
    and se.id <> coalesce(entry_row.paired_entry_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and entry_row.id <> coalesce(se.paired_entry_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and int4range(se.start_slot_order, se.start_slot_order + se.slot_count)
        && int4range(entry_row.start_slot_order, entry_row.start_slot_order + entry_row.slot_count)
    and sec.class_id = new.class_id;

  if conflict_count > 0 then
    raise exception 'Conflit : une classe de ce cours a deja un cours sur ce creneau.';
  end if;

  return new;
end;
$$;

create trigger check_class_conflict_on_link_trigger
  before insert on public.schedule_entry_classes
  for each row execute function public.check_class_conflict();

create function public.check_class_conflict_on_move()
returns trigger
language plpgsql set search_path = public as $$
declare
  conflict_count integer;
begin
  select count(*) into conflict_count
  from public.schedule_entries se
  join public.schedule_entry_classes sec on sec.entry_id = se.id
  where se.id <> new.id
    and se.establishment_id = new.establishment_id
    and se.academic_year_id = new.academic_year_id
    and se.day_of_week = new.day_of_week
    and se.id <> coalesce(new.paired_entry_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and new.id <> coalesce(se.paired_entry_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and int4range(se.start_slot_order, se.start_slot_order + se.slot_count)
        && int4range(new.start_slot_order, new.start_slot_order + new.slot_count)
    and sec.class_id in (select class_id from public.schedule_entry_classes where entry_id = new.id);

  if conflict_count > 0 then
    raise exception 'Conflit : une classe de ce cours a deja un cours sur ce creneau.';
  end if;

  return new;
end;
$$;

create trigger check_class_conflict_on_move_trigger
  before update of day_of_week, start_slot_order, slot_count on public.schedule_entries
  for each row execute function public.check_class_conflict_on_move();

create function public.sync_paired_entry()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.paired_entry_id is not null then
    update public.schedule_entries
    set paired_entry_id = new.id
    where id = new.paired_entry_id
      and paired_entry_id is distinct from new.id;
  end if;

  if tg_op = 'UPDATE' and old.paired_entry_id is not null and old.paired_entry_id is distinct from new.paired_entry_id then
    update public.schedule_entries
    set paired_entry_id = null
    where id = old.paired_entry_id and paired_entry_id = old.id;
  end if;

  return new;
end;
$$;

create trigger sync_paired_entry_trigger
  after insert or update of paired_entry_id on public.schedule_entries
  for each row execute function public.sync_paired_entry();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.schedule_entry_classes enable row level security;
alter table public.teacher_levels enable row level security;
alter table public.teacher_unavailability enable row level security;
alter table public.establishment_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'schedule_entry_classes', 'teacher_levels', 'teacher_unavailability'
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

-- establishment_settings : lecture par tout le monde de l'etablissement, ecriture
-- admin/scheduler uniquement ; pas de policy insert (creee uniquement par trigger).
create policy establishment_settings_select on public.establishment_settings
  for select using (establishment_id = public.current_establishment_id());
create policy establishment_settings_update on public.establishment_settings
  for update using (establishment_id = public.current_establishment_id() and public.current_role() in ('admin', 'scheduler'))
  with check (establishment_id = public.current_establishment_id());
