-- Le volume horaire reglementaire est defini par niveau (toutes les classes
-- d'un meme niveau partagent le meme volume par matiere), pas par classe
-- individuelle -- voir Source/README.md "Volume horaire par discipline et
-- par niveau". On bascule curriculum_items de class_id vers level_id.

alter table public.curriculum_items
  add column level_id uuid references public.levels(id) on delete cascade;

update public.curriculum_items ci
set level_id = c.level_id
from public.classes c
where c.id = ci.class_id;

alter table public.curriculum_items
  drop constraint curriculum_items_class_id_subject_id_key;

alter table public.curriculum_items
  alter column level_id set not null;

alter table public.curriculum_items
  drop column class_id;

alter table public.curriculum_items
  add constraint curriculum_items_level_id_subject_id_key unique (level_id, subject_id);
