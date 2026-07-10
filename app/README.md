# EDT Manager

Application web multi-établissements pour **paramétrer** un lycée/collège (créneaux, salles,
niveaux, classes, matières, professeurs, volumes horaires, groupes pédagogiques) et **construire
manuellement** les emplois du temps classes/profs/salles, avec **détection de conflits en temps
réel** (unicité des ressources, plafonds horaires, séquençage pédagogique, EPS, tronc commun,
tandems, LV2...).

Ce n'est pas un solveur automatique : la répartition reste manuelle (glisser-déposer), l'application
se contente de rendre les erreurs impossibles à manquer.

Le contexte métier détaillé (règles de la DRENA, charte de conception, exemples) est documenté dans
`../Source/README.md` et `../Source/EDT_prompt.pdf`.

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite, TailwindCSS v4, primitives UI façon shadcn/ui
  (Radix + `class-variance-authority`, écrites à la main dans `src/components/ui`)
- **Routing** : React Router
- **Données serveur** : TanStack Query + client Supabase (`src/lib/supabase.ts`)
- **État local** : Zustand (filtres UI), `useState`/contexte React pour le reste
- **Glisser-déposer** : `@dnd-kit`
- **Export** : `xlsx` (SheetJS) pour Excel, impression navigateur pour le PDF
- **Backend** : Supabase (Postgres + Auth + Row Level Security), pas de serveur API séparé
- **Tests** : Vitest (moteur de règles métier)

## Arborescence

```
app/
├── src/
│   ├── components/ui/       # primitives (Button, Dialog, Select, Table...)
│   ├── components/          # CrudSection, EntityForm, RouteGuards (composants partagés)
│   ├── lib/
│   │   ├── supabase.ts      # client Supabase (URL + clé depuis .env.local)
│   │   ├── auth.tsx         # contexte d'authentification (session Supabase)
│   │   ├── entity-crud.ts   # factory CRUD générique (liste/creation/edition/suppression)
│   │   └── constraints/     # moteur de validation des règles métier (+ rules.test.ts)
│   ├── features/
│   │   ├── profile/         # profil utilisateur, création d'établissement
│   │   ├── setup/           # ressources CRUD (créneaux, salles, profs, groupes...)
│   │   ├── builder/         # grille de construction (dnd-kit, rendu des créneaux)
│   │   ├── validation/      # agrégation des données + calcul des violations
│   │   └── export/          # génération du classeur Excel
│   ├── pages/
│   │   ├── auth/            # /login, /signup
│   │   ├── Onboarding.tsx   # /onboarding : création de l'établissement
│   │   └── app/             # /app/:establishmentId/* (dashboard, builder, report, export, setup/*)
│   └── types/database.types.ts  # types générés depuis le schéma Supabase
├── supabase/migrations/     # migrations SQL appliquées au projet Supabase (schéma + RLS)
├── .env.local               # URL + clé Supabase (non commité)
└── .env.example
```

## Prérequis

- Node.js 20+ et npm
- Un projet Supabase (déjà créé pour ce projet : voir `.env.local`)

## Lancer l'application en local

```bash
cd app
npm install
npm run dev
```

L'application démarre sur [http://localhost:5173](http://localhost:5173).

Premier lancement : créez un compte depuis `/signup`, confirmez l'email si la confirmation est
activée sur le projet Supabase, puis suivez l'assistant d'onboarding pour créer votre établissement
(nom, type). Vous êtes alors administrateur de cet établissement.

### Variables d'environnement

Le fichier `.env.local` (déjà présent, non commité) contient :

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Ces valeurs proviennent du projet Supabase `edt-manager` (région `eu-west-1`). Pour les retrouver ou
en générer d'autres (ex. pour un nouvel environnement) : Dashboard Supabase → Project Settings →
API, ou via l'outil MCP Supabase (`get_project_url` / `get_publishable_keys`).

## Base de données Supabase

Le schéma (tables, RLS, triggers) est versionné dans `supabase/migrations/*.sql`, appliqué dans
l'ordre numérique :

1. `0001_init.sql` — schéma complet multi-établissements + RLS de base
2. `0002_security_hardening.sql` — durcissement des fonctions (search_path, permissions)
3. `0003_allow_paired_group_class_overlap.sql` — autorise une classe sur 2 groupes liés (tandem/LV2)
4. `0004_sync_paired_group_reciprocal.sql` — synchronise le lien tandem dans les 2 sens
5. `0005_fix_establishments_select_bootstrap.sql` — corrige la création du tout premier établissement

Pour repartir d'un projet Supabase vierge, réappliquez ces fichiers dans l'ordre (SQL Editor du
dashboard, ou l'outil MCP `apply_migration`), puis régénérez les types TypeScript
(`mcp__claude_ai_Supabase__generate_typescript_types`) dans `src/types/database.types.ts` si le
schéma a changé.

### Modèle de données (résumé)

- `establishments` / `profiles` (rôles `admin` / `scheduler` / `viewer`) — multi-tenant, RLS stricte
- `academic_years`, `time_slots`, `rooms`, `levels`, `classes`, `subjects`, `teachers`,
  `teacher_subjects`, `curriculum_items` — configuration de l'établissement
- `teaching_groups` (+ `teaching_group_classes`, `teaching_group_teachers`) — l'unité pédagogique
  placée dans la grille : une classe = cours normal, plusieurs classes = tronc commun, deux groupes
  liés via `paired_group_id` = tandem PC/SVT ou LV2 simultanée
- `schedule_entries` — les séances réellement placées sur la grille (jour, créneau, salle)
- `arbitration_notes` — justifications des dérogations, pour le rapport d'arbitrage

## Moteur de validation des règles

`src/lib/constraints/rules/*.ts`, une fonction pure par règle (unicité des ressources, plafond
horaire, 3 niveaux max par cycle, anti-monopole, séquençage langues/sciences, placement EPS, heures
creuses, simultanéité tandem/LV2). Recalculé en direct dans le builder, le tableau de bord et le
rapport d'arbitrage.

```bash
npm run test        # vitest run — tests unitaires du moteur de regles
```

## Qualité / build

```bash
npm run lint         # oxlint
npx tsc -b           # verification des types
npm run build        # tsc -b && vite build -> dist/
npm run preview      # sert le build de production en local
```

## Déploiement

Frontend statique (dossier `dist/` après `npm run build`) déployable sur Vercel/Netlify/toute
plateforme de sites statiques, en configurant les 2 variables d'environnement
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` côté plateforme. Le backend (Supabase) est
déjà hébergé et managé, aucun serveur à déployer.
