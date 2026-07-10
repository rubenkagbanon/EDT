-- Le tandem PC/SVT et les troncs communs LV2 placent volontairement la meme
-- classe sur 2 groupes pedagogiques *lies* (paired_group_id) au meme creneau,
-- dans 2 salles distinctes. Le trigger de conflit doit exclure ce cas precis
-- du controle d'unicite "classe", tout en le gardant strict pour l'enseignant
-- et pour toute autre combinaison de groupes non lies.

create or replace function public.check_schedule_conflicts()
returns trigger
language plpgsql set search_path = public as $$
declare
  conflict_count integer;
  new_group_paired_id uuid;
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

  select paired_group_id into new_group_paired_id
  from public.teaching_groups where id = new.teaching_group_id;

  select count(*) into conflict_count
  from public.schedule_entries se
  join public.teaching_group_classes tgc on tgc.group_id = se.teaching_group_id
  where se.id <> new.id
    and se.establishment_id = new.establishment_id
    and se.academic_year_id = new.academic_year_id
    and se.day_of_week = new.day_of_week
    and se.teaching_group_id <> new.teaching_group_id
    and se.teaching_group_id <> coalesce(new_group_paired_id, '00000000-0000-0000-0000-000000000000'::uuid)
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
