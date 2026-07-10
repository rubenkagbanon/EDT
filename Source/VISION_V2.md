# Vision V2 - EDT Pro Professionnel

Document stratégique pour l'évolution vers une solution commerciale.

## État Actuel (V1)

### Strengths
✅ Génération automatique fiable (OR-Tools)
✅ Interface simple Streamlit
✅ Déploiement facile (standalone)
✅ Gratuit et open-source
✅ Données flexibles (JSON)

### Limitations V1
❌ Pas de persistence multi-projets
❌ Pas d'authentification utilisateurs
❌ Pas d'historique générations
❌ Pas de collaborative editing
❌ Pas d'APIs externes
❌ Pas de mobile
❌ Pas d'intégrations systèmes école

## Roadmap V2 (6-12 mois)

### T1 : Backend Professionnel (Mois 1-3)

#### 1.1 Base de données Supabase
```sql
-- Tables principales
- establishments (écoles)
  - id, name, location, contact
  - subscription_tier, users_count

- users (admin/responsables EDT)
  - id, email, establishment_id
  - role (admin, scheduler, viewer)
  - auth via Supabase

- schedules (historique EDT)
  - id, establishment_id, year, semester
  - created_at, generated_at, status

- schedules_data (snapshot données)
  - id, schedule_id
  - teachers, classes, rooms, courses (JSON)

- schedules_results (résultats génération)
  - id, schedule_id
  - timetable (JSON), quality_score
  - solver_logs
```

#### 1.2 API REST (FastAPI)
```python
# Endpoints
POST   /api/v1/establishments/{id}/schedules
GET    /api/v1/schedules/{id}
PUT    /api/v1/schedules/{id}/data
POST   /api/v1/schedules/{id}/generate
GET    /api/v1/schedules/{id}/result
DELETE /api/v1/schedules/{id}

POST   /api/v1/schedules/{id}/export/excel
POST   /api/v1/schedules/{id}/export/pdf
```

#### 1.3 Authentification
- Supabase Auth (email/password + SSO)
- Rôles: Admin, Scheduler, Viewer, Principal
- Multi-tenancy (une écoles = plusieurs projets)

### T2 : Frontend Moderne (Mois 2-4)

#### 2.1 Dashboard React
```
/dashboard
  - Calendrier projets EDT
  - Historique générations
  - Quick stats (profs, classes, etc.)

/projects
  - Liste établissements
  - Nouveau projet EDT
  - Paramètres

/editor
  - Éditeur données (tableau Pandas-like)
  - Import Excel drag-drop
  - Validation temps-réel
  - Aperçu avant génération

/results
  - Visualisation EDT interactive
  - Filtres classe/prof/salle
  - Timeline semaine
  - Statistiques qualité

/exports
  - Manage versions (V1, V2, V3...)
  - Télécharger Excel/PDF
  - Partager lien public
  - Email distribution
```

#### 2.2 Composants UI
- Header: Logo, User, Help
- Sidebar: Navigation, Settings
- Charts: Quality metrics, Utilisation salles
- Tables: Data editor interactive
- Modal: Generate options, Feedback

### T3 : Fonctionnalités Avancées (Mois 4-8)

#### 3.1 Solveur Amélioré
```python
# Nouvelles contraintes soft
- Minimiser déplacements profs (distance entre salles)
- Équilibrer matériel (ordi, vidéo-projecteur)
- Regrouper matière du même prof (peu de changements)
- Éviter trous > 2h pour profs
- Co-enseignement explicite
- Modules optionnels (langues rares)
```

#### 3.2 Gestion Avancée
- Multi-semaines / périodes
- Vacances scolaires automatiques
- Remplacement profs (suppléants)
- Ajustements post-génération (UI)
- Comparaison versions
- Merging changements

#### 3.3 Intégrations
```
- Pronote API (import/export données)
- Scolinfo (consultation profs)
- Google Calendar (sync calendriers)
- iCal export (ajouter calendrier)
- Slack notifications (édition)
- Email PDF automated
```

### T4 : Scalabilité & Sécurité (Mois 6-12)

#### 4.1 Performance
- Queue de résolution (Bull/Redis)
- Caching résultats
- Background jobs (Celery/APScheduler)
- CDN exports (CloudFront)
- Database indexing optimisé

#### 4.2 Sécurité
- Row Level Security Supabase
- Audit log (qui a modifié quoi)
- 2FA optionnel pour admins
- Chiffrement données sensibles
- RGPD compliance (droit à l'oubli)

#### 4.3 Infrastructure
```
Prod setup:
- Frontend: Vercel (React)
- Backend: Railway ou Fly.io (FastAPI)
- DB: Supabase PostgreSQL
- Queue: Supabase Functions
- Storage: S3 compatible

Coût estimé: 50-200€/mois pour multi-écoles
```

## Modèle Commercial V2

### Options de Monétisation

#### 1. SaaS par Établissement
```
- Basic: 99€/mois (1 projet/an, 100 étudiants)
- Pro: 299€/mois (multi-projets, 1000 étudiants)
- Enterprise: 599€/mois (unlimited, support priority)
- Features: Support email, Updates, Stockage exports
```

#### 2. Licence Perpétuelle
```
- Établissement privé: 2000€ (setup + hosting)
- Données + exports à jamais
- Support 1 an inclus
- Mises à jour gratuites
```

#### 3. Freemium (Attirage)
```
- Free: 1 établissement max, 10 profs, export limité
- Premium: Upgrade to Pro/Enterprise
- Conversion: 5-10% free users
```

### Stratégie de Lancement

**Phase 1: Beta (Mois 0-2)**
- Pilot: 3-5 établissements (gratuit)
- Collect feedback intensif
- Stabilise features core

**Phase 2: Early Access (Mois 2-4)**
- 20 écoles pilotes (tarif réduit 50%)
- Case studies & testimonials
- Ref website & docs

**Phase 3: GA Public (Mois 4+)**
- Marketing: Edtech forums, salons éducation
- Sales: Commerciaux à rectorats
- Support: Ticketing system, Docs

### Différenciation Marché

| Critère | EDT Pro V2 | EDT Pro Concurrent |
|---------|-----------|-----------------|
| Prix | 99€/mois | 300-500€/mois |
| Déploiement | Cloud (5min) | On-Premise complexe |
| Algorithme | OR-Tools moderne | Heuristiques vieilles |
| UX | React moderne | Interface datée |
| Support | Français | Anglais |
| SSO Écoles | Roadmap | Premium only |

## Architecture Technique V2

```
edt-pro-v2/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/             # Zustand/Redux
│   │   └── api/               # Client API
│   └── package.json
│
├── backend/                   # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── schemas/
│   │   ├── models/
│   │   ├── services/
│   │   └── solver/            # OR-Tools intégré
│   ├── tests/
│   ├── requirements.txt
│   └── main.py
│
├── supabase/                  # Database + Auth
│   └── migrations/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Stack Technique V2 (Recommandé)

| Layer | Tech | Raison |
|-------|------|--------|
| Frontend | React 18 + TS | Moderne, performant |
| UI Framework | TailwindCSS + Shadcn | Rapide, pro |
| State | Zustand | Simple, léger |
| Backend | FastAPI | Fast, async |
| DB | Supabase PostgreSQL | Managed, RLS |
| Auth | Supabase Auth | Intégré, SSO ready |
| Jobs | Supabase Functions | Serverless, scalable |
| Solver | OR-Tools | Production-grade |
| Deploy | Vercel + Railway | Gratuit/cheap tier |

## Timeline & Budget V2

### Développement
- Backend API: 3-4 mois (60k€)
- Frontend React: 4-5 mois (60k€)
- Tests & QA: 1-2 mois (20k€)
- Intégrations: 1-2 mois (15k€)
- Déploiement & Ops: 1 mois (10k€)
- **Total Dev**: ~165k€ (3-4 devs, 6 mois)

### Infrastructure (annuel)
- Supabase: 500€
- Vercel: 100€
- Railway/Fly: 1000€
- Support: 2000€
- **Total Ops**: 3600€/an

### Go-to-Market
- Website: 10k€
- Marketing: 20k€
- Sales tools: 5k€
- **Total GTM**: 35k€ (one-time)

## KPIs Succès V2

| KPI | Cible |
|-----|-------|
| Time-to-Deploy | < 5 min |
| Génération Success | > 98% |
| User Satisfaction | 4.5+ / 5 |
| Support Response | < 24h |
| Scalabilité | 1000+ écoles |
| Revenue MRR | 10k€+ |

## Questions Stratégiques

1. **Freemium ou B2B pur?** → Freemium pour acquisition
2. **SaaS ou Self-hosted?** → SaaS + option on-prem premium
3. **Support multi-langue?** → FR/EN d'abord, ES/DE en V2.1
4. **Open-source?** → Oui, core engine reste OSS, features commerciales propriétaires
5. **Partenariats?** → Pronote, Scolinfo, Académies rectorales

## Roadmap Court Terme (3-6 mois)

**Avant V2 complète**, petites améliora V1.x:
- ✅ Import/export Excel amélioré
- ✅ Support multi-cycles (6e-Ter)
- ✅ Templates prédéfinis écoles
- ✅ API simple (REST)
- ✅ Documentation vidéo

Ces features gagnent acquisition sans refonte complète.
