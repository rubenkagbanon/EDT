-- INSERT ... RETURNING (utilise par le client Supabase via .select()) exige
-- que la policy SELECT autorise aussi la ligne nouvellement creee. Or au
-- moment de la creation d'un etablissement (onboarding), le profil de
-- l'utilisateur n'est pas encore lie (establishment_id est NULL), donc
-- `id = current_establishment_id()` echoue toujours pour ce cas precis.
-- On autorise en plus le createur a voir ce qu'il vient de creer.

drop policy establishments_select on public.establishments;

create policy establishments_select on public.establishments
  for select using (id = public.current_establishment_id() or created_by = auth.uid());
