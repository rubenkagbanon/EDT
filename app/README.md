# EDT Manager

Application web multi-établissements pour **paramétrer** un lycée/collège (créneaux, salles,
niveaux, classes, matières, professeurs, volumes horaires, groupes pédagogiques) et **construire**
les emplois du temps classes/profs/salles — manuellement (glisser-déposer avec détection de
conflits en temps réel) ou en un clic via une **génération automatique** qui remplit les séances
non placées en respectant les mêmes règles.

Le contexte métier détaillé (règles de la DRENA, charte de conception, exemples chiffrés) est
documenté dans `../Source/README.md` et `../Source/EDT_prompt.pdf` — ce README explique comment
ces règles sont *implémentées*, pas d'où elles viennent.

## 1. Principes de fonctionnement

L'application repose sur une distinction centrale entre **3 couches d'information** ; il faut les
garder claires en tête pour modifier quoi que ce soit :

1. **Le référentiel** (`levels`, `classes`, `rooms`, `subjects`, `teachers`, `time_slots`) : ce qui
   existe dans l'établissement, indépendamment de tout emploi du temps.
2. **Le besoin pédagogique** :
   - `curriculum_items` — un **objectif réglementaire** par **niveau** + matière ("6ème a besoin de
     5h de Français/semaine"). Purement informatif : rien n'est plaçable à partir de cette table
     seule.
   - `teaching_groups` (+ `teaching_group_classes`, `teaching_group_teachers`) — la **traduction
     concrète** de ce besoin : *qui* enseigne *quoi* à *quelles classes*, découpé en séances
     (`session_slot_lengths`, ex. `[2,1,1,1,1]` pour 6h en 5 séances). C'est la seule chose que le
     builder et le générateur automatique savent placer. Un groupe couvre 3 cas :
     - **Cours normal** : 1 classe, 1 enseignant.
     - **Tronc commun** : plusieurs classes, 1 seul enseignant (le volume ne compte qu'une fois
       pour l'enseignant, mais séparément pour chaque classe).
     - **Tandem / LV2 simultanée** : 2 groupes liés par `paired_group_id` (synchronisé dans les 2
       sens automatiquement, voir migration `0004`), qui doivent être placés **au même jour/créneau
       exact**, dans **2 salles distinctes**, avec **2 enseignants distincts** (PC/SVT en tandem,
       Allemand/Espagnol en tronc commun LV2 au lycée).
3. **Le placement réel** : `schedule_entries` — une ligne = une séance effectivement posée sur la
   grille (jour, `start_slot_order`, `slot_count`, salle). C'est la seule table que le glisser-
   déposer et la génération automatique écrivent.

**Aucune règle de planification n'est câblée en dur dans l'UI** : tout passe par le moteur de
règles (`src/lib/constraints`), un module unique et testé, que consomment aussi bien le builder que
le tableau de bord, le rapport et le générateur automatique. Modifier une règle à un seul endroit la
change partout.

## 2. Stack technique

- **Frontend** : React 18 + TypeScript + Vite, TailwindCSS v4, primitives UI façon shadcn/ui
  (Radix + `class-variance-authority`, écrites à la main dans `src/components/ui`)
- **Routing** : React Router
- **Données serveur** : TanStack Query + client Supabase (`src/lib/supabase.ts`)
- **État local** : Zustand (filtres UI), `useState`/contexte React pour le reste
- **Glisser-déposer** : `@dnd-kit`
- **Export** : `xlsx` (SheetJS, installé depuis le CDN officiel SheetJS — voir §7) pour Excel,
  impression navigateur pour le PDF
- **Backend** : Supabase (Postgres + Auth + Row Level Security), pas de serveur API séparé
- **Tests** : Vitest (moteur de règles + générateur automatique)

## 3. Modèle de données

Toutes les tables métier portent `establishment_id` (défaut `current_establishment_id()`) ; RLS
limite chaque requête à l'établissement de l'utilisateur connecté (voir §5).

| Table | Rôle |
|---|---|
| `establishments` | Un établissement (nom, type collège/lycée) |
| `profiles` | 1 ligne par utilisateur Supabase Auth : `establishment_id`, `role` (admin/scheduler/viewer) |
| `academic_years` | Années scolaires ; `is_active` détermine celle utilisée par le builder |
| `time_slots` | La grille horaire : `day_of_week`, `start_time`/`end_time`, `kind` (cours/recreation/dejeuner/banalise), `order_index` — voir §4.1 |
| `rooms` | `room_type` : `salle_principale` / `laboratoire` / `polyvalente` / `terrain` / `autre` |
| `levels` | Niveaux (6ème, 5ème... 2nde A...), `cycle` (college/lycee) |
| `classes` | Classes, rattachées à un `level_id` |
| `subjects` | `code`, `name`, `subject_group` (`langues` / `sciences` / `autre`) — alimente la règle de séquençage |
| `teachers` | `max_weekly_hours` — voir §4.2 |
| `teacher_subjects` | Habilitations matière ↔ enseignant |
| `curriculum_items` | Volume horaire par **niveau** + matière (voir §1, migration `0006`) |
| `teaching_groups` | L'unité pédagogique placée (voir §1) : `subject_id`, `label`, `session_slot_lengths`, `paired_group_id` |
| `teaching_group_classes` / `teaching_group_teachers` | Jonctions many-to-many groupe ↔ classes / groupe ↔ enseignants |
| `schedule_entries` | Séances placées : `teaching_group_id`, `day_of_week`, `start_slot_order`, `slot_count`, `room_id` |
| `arbitration_notes` | Justification d'une dérogation (rapport d'arbitrage) |

Contraintes DB qui font autorité indépendamment de l'UI (`supabase/migrations/0001_init.sql`,
durcies par `0003`/`0004`) :
- Exclusion GiST sur `schedule_entries` : 2 entrées ne peuvent pas se chevaucher dans la **même
  salle** au même jour.
- Trigger `check_schedule_conflicts` : rejette un chevauchement partageant un **enseignant** ou une
  **classe**, sauf si les 2 groupes sont l'un l'autre leur `paired_group_id` (tandem/LV2 autorisé).

### 4.1 `time_slots.order_index` : à ne pas confondre avec une heure

`order_index` est la position **chronologique** du créneau dans sa journée (1er, 2e, 3e...), pas une
heure. Il doit être unique par jour et croissant, mais peut inclure les pauses (récréation,
déjeuner) comme des créneaux à part entière. C'est ce qui permet au moteur de règles de savoir si 2
cours se suivent **vraiment** (`end === start` en `order_index`) pour la règle de séquençage, et de
repérer les 2 premiers/derniers créneaux "cours" du jour pour la règle EPS. Voir
`src/lib/constraints/helpers.ts:courseSlotsForDay`.

### 4.2 `teachers.max_weekly_hours` : le plafond de service

Le nombre maximum d'heures de cours attribuables à un enseignant par semaine, toutes classes
confondues. Règle dure (`teacherCeiling`) : jamais dépassable, contrairement au reste qui peut être
soft. Note structurelle importante : la règle `max_levels_per_cycle` (≤ 3 niveaux/enseignant/cycle)
rend **mathématiquement impossible** qu'un seul enseignant couvre les 4 niveaux d'un collège — il
en faut toujours au moins 2 par matière.

## 5. Auth, rôles, multi-tenant

- Supabase Auth (email/mot de passe). `/login`, `/signup`, `/forgot-password` (envoie un lien de
  réinitialisation), `/reset-password` (hors garde `RequireGuest` — le lien de récupération établit
  une session que ce garde renverrait sinon vers le dashboard, voir `src/components/RouteGuards.tsx`).
- `profiles.role` : `admin` (établissement + utilisateurs), `scheduler` (setup + builder),
  `viewer` (lecture seule). `canEdit` = `admin` ou `scheduler`, vérifié dans chaque écran d'édition.
- RLS : chaque table SELECT/INSERT/UPDATE/DELETE est filtrée par
  `establishment_id = current_establishment_id()` (fonction Postgres lisant le JWT), + rôle pour
  l'écriture. Un utilisateur ne voit jamais les données d'un autre établissement.

## 6. Moteur de validation des règles (`src/lib/constraints/`)

**`types.ts`** définit `ScheduleContext` (tout l'état nécessaire : créneaux, salles, classes,
niveaux, matières, profs, groupes, jonctions, entries) et `Violation` (`ruleCode`, `severity`
`hard`|`soft`, `message`, `entryIds`). **Chaque règle est une fonction pure
`(ctx: ScheduleContext) => Violation[]`** qui recalcule sur l'intégralité de `ctx.entries` — pas de
variante incrémentale, volontairement, pour rester simple et exhaustive.

**`index.ts`** expose `runAllRules(ctx)` (toutes les règles, triées dur → souple puis par priorité
d'arbitrage) et `violationsForEntry(violations, entryId)`. C'est le seul point d'entrée que
consomment `useViolations`/`useValidationSummary` (`src/features/validation/`), utilisés par le
Dashboard, le Builder, le Rapport et l'Export.

| Fichier (`rules/`) | Sévérité | Ce qu'elle vérifie |
|---|---|---|
| `resourceUnicity.ts` | dure | Classe/prof/salle jamais sur 2 cours au même créneau (chevauchement d'intervalles `order_index`), sauf classe partagée par des groupes liés (tandem/LV2) |
| `teacherCeiling.ts` | dure | Somme des `slot_count` par enseignant ≤ `max_weekly_hours` |
| `maxLevelsPerCycle.ts` | dure | Un enseignant ≤ 3 niveaux distincts, comptés séparément par cycle (collège / lycée) |
| `antiMonopoly.ts` | souple | Un enseignant ne doit pas couvrir *toutes* les classes d'un niveau pour une matière |
| `sequencing.ts` | souple | 4 sous-règles par classe/jour : pas 2 "langues" d'affilée, pas 2 "sciences" d'affilée, pas 2× la même matière/jour, ≥ 3 matières différentes/jour |
| `epsPlacement.ts` | dure | Bloc unique de 2 créneaux, salle `terrain`, aux 2 premiers ou 2 derniers créneaux "cours" du jour |
| `gapsPlacement.ts` | souple | Heure creuse encadrée par des cours occupés (avant **et** après) dans la même journée |
| `pairedGroupSimultaneity.ts` | dure | 2 groupes liés (`paired_group_id`) doivent partager jour/créneau/durée, avec 2 salles distinctes |

`rules.test.ts` fixe le comportement attendu de chaque règle avec des fixtures minimalistes — à lire
avant de modifier une règle, et à étendre si on en ajoute une.

## 7. Génération automatique (`src/features/builder/autoGenerate.ts`)

Bouton "Générer automatiquement" dans le Builder : remplit les séances **actuellement non
placées**, sans jamais toucher aux entrées déjà posées (manuellement ou par un run précédent).

- **Calcul des séances restantes** : `remainingSessionsForGroup` (`src/lib/constraints/helpers.ts`)
  fait la différence de *multiset* entre `session_slot_lengths` et les `slot_count` déjà placés
  pour ce groupe — pas une simple troncature positionnelle (ancien bug corrigé). Utilisé aussi bien
  par le générateur que par `pendingSessionsForGroups` (liste "Séances à placer" du builder).
- **Algorithme** : recherche gloutonne à ~6 redémarrages aléatoires (pas de solveur ILP/CP-SAT en
  JS, hors scope pour un bouton V1). Pour chaque séance à placer (EPS en premier, puis les paires
  tandem/LV2, puis par durée décroissante) : génère les créneaux candidats compatibles (fenêtres
  spéciales pour l'EPS, fenêtres glissantes de créneaux "cours" strictement contigus sinon), filtre
  ceux qui respectent les 4 règles dures pertinentes au placement (unicité, plafond horaire, EPS,
  simultanéité tandem/LV2 — via des Maps d'occupation en mémoire, pas en rappelant `runAllRules` à
  chaque essai, trop coûteux), choisit le meilleur candidat selon un coût qui mirror les règles
  souples (séquençage, heures creuses). Garde le meilleur essai (moins de séances non placées, puis
  coût le plus faible).
- Les séances qu'il ne peut pas placer restent dans "Séances à placer" pour un ajustement manuel —
  c'est un complément au mode manuel, pas un remplacement. `runAllRules` reste la validation
  faisant autorité une fois les entrées insérées (même mécanisme que pour le drag-and-drop manuel).
- Tests : `autoGenerate.test.ts`, vérifie notamment qu'aucune violation dure n'est introduite en
  repassant `runAllRules` sur le résultat.

## 8. Pages de l'application

- `/login`, `/signup`, `/forgot-password`, `/reset-password` — authentification.
- `/onboarding` — création de l'établissement (nom, type), rattache l'utilisateur comme `admin`.
- `/app/:establishmentId/dashboard` — vue d'ensemble (comptes, violations ouvertes).
- `/app/:establishmentId/setup/{time-slots,rooms,levels,subjects,teachers,curriculum,groups}` — CRUD
  du référentiel et du besoin pédagogique (voir §1). `time-slots` a un formulaire particulier :
  plusieurs jours à cocher + plusieurs lignes (ordre/début/fin) + un seul type appliqué à toutes les
  combinaisons, pour bulk-créer une grille en un clic (`TimeSlotsPage.tsx`).
- `/app/:establishmentId/builder` — la grille de construction : 3 vues (classe/prof/salle),
  glisser-déposer des séances en attente, cellules rouges = violation, bouton "Générer
  automatiquement" (§7).
- `/app/:establishmentId/report` — violations groupées par règle, justifications
  (`arbitration_notes`).
- `/app/:establishmentId/export` — export Excel (conventions `CODE (SALLE)` / `CLASSE (SALLE)` /
  `CLASSE (CODE)`) et impression PDF.

## 9. Base de données Supabase — migrations

`supabase/migrations/*.sql`, appliquées dans l'ordre :

1. `0001_init.sql` — schéma complet + RLS de base
2. `0002_security_hardening.sql` — durcissement des fonctions (search_path, permissions)
3. `0003_allow_paired_group_class_overlap.sql` — autorise une classe sur 2 groupes liés
4. `0004_sync_paired_group_reciprocal.sql` — synchronise `paired_group_id` dans les 2 sens
5. `0005_fix_establishments_select_bootstrap.sql` — corrige la création du tout premier établissement
6. `0006_curriculum_items_by_level.sql` — `curriculum_items` passe de `class_id` à `level_id`

Pour un projet Supabase vierge : réappliquer dans l'ordre (SQL Editor ou `apply_migration`), puis
régénérer `src/types/database.types.ts` (`generate_typescript_types`) si le schéma a changé.

## 10. Lancer l'application en local

```bash
cd app
npm install
npm run dev
```

[http://localhost:5173](http://localhost:5173). `.env.local` (non commité) contient
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` du projet Supabase déjà provisionné.

## 11. Qualité / build

```bash
npm run test         # vitest run — regles + generateur automatique
npm run lint          # oxlint
npx tsc -b            # verification des types
npm run build         # tsc -b && vite build -> dist/
npm run preview       # sert le build de production en local
```

## 12. Déploiement

Frontend statique (`dist/` après `npm run build`) déployable sur Vercel/Netlify/toute plateforme de
sites statiques, en configurant les 2 variables d'environnement côté plateforme. Le backend
(Supabase) est déjà hébergé et managé, aucun serveur à déployer.
