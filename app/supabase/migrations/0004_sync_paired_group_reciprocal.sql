-- Garantit que le lien paired_group_id est toujours symetrique (A->B implique B->A),
-- meme si l'UI ne definit le lien que dans un sens.

create function public.sync_paired_group()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.paired_group_id is not null then
    update public.teaching_groups
    set paired_group_id = new.id
    where id = new.paired_group_id
      and paired_group_id is distinct from new.id;
  end if;

  if tg_op = 'UPDATE' and old.paired_group_id is not null and old.paired_group_id is distinct from new.paired_group_id then
    update public.teaching_groups
    set paired_group_id = null
    where id = old.paired_group_id and paired_group_id = old.id;
  end if;

  return new;
end;
$$;

create trigger sync_paired_group_trigger
  after insert or update of paired_group_id on public.teaching_groups
  for each row execute function public.sync_paired_group();
