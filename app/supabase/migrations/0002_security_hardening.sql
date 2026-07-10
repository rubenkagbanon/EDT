-- Corrige les avertissements du linter de securite Supabase.

-- 1) search_path mutable sur le trigger de conflits
create or replace function public.check_schedule_conflicts()
returns trigger
language plpgsql set search_path = public as $$
declare
  conflict_count integer;
begin
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

-- 2) deplacer btree_gist hors du schema public
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

-- 3) empecher l'appel direct de ces fonctions via l'API RPC publique.
-- handle_new_user / protect_profile_role ne sont utilisees que par des triggers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- current_establishment_id / current_role sont utilisees dans les policies RLS
-- (le role authenticated doit garder EXECUTE pour que les policies s'evaluent),
-- mais ne doivent pas etre appelables anonymement ni exposees comme RPC publique.
revoke execute on function public.current_establishment_id() from public, anon;
revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_establishment_id() to authenticated;
grant execute on function public.current_role() to authenticated;
