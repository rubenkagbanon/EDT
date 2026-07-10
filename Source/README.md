# Générateur d'Emplois du Temps — Groupe Scolaire Vatican 2 (2025-2026)

Application d'aide à la conception et à la génération automatique des emplois du temps (EDT) des **classes**, **enseignants** et **salles** du Groupe Scolaire Vatican 2, dans le respect des contraintes pédagogiques, logistiques et humaines fixées par la DRENA et la direction.

---

## 1. Contexte

L'établissement doit construire chaque année les EDT de 18 classes (collège + lycée), de 27 affectations d'enseignants et de 16 salles. Cette tâche est combinatoire et fastidieuse : volumes horaires réglementaires à couvrir exactement, contraintes anti-surcharge cognitive, partage des salles, cours en tronc commun, tandems scientifiques, etc.

L'objectif de l'application est de :
- générer des EDT cohérents, sans conflit de ressource (classe / enseignant / salle jamais sur deux cours au même créneau),
- minimiser les heures creuses en créant des **blocs d'enseignement continus**,
- produire un **rapport d'arbitrage** documentant chaque conflit résolu et chaque dérogation justifiée.

Les données sources et toutes les règles métier sont consolidées dans le fichier `EDT_data.xlsm` (feuilles `Prompt` et `charte`).

---

## 2. Modèle de données (source : `EDT_data.xlsm`)

### Grille horaire (feuille `créneaux`)
- **41 créneaux** d'une heure par semaine, du lundi au vendredi.
- Matinée : 5 créneaux (07h00→09h00, 09h00→10h00, puis 10h30→12h30 après récréation).
- Récréation matin : **10h00–10h30**. Déjeuner : **12h30–14h00**. Récréation après-midi : **16h00–16h15**.
- Après-midi : 4 créneaux (14h00→16h00, puis 16h15→18h15).
- **Mercredi après-midi entièrement banalisé** → inscrire « Vie scolaire » partout, aucun cours.

### Salles (feuille `salles`) — 16 lieux
| Type | Nom | Capacité / usage prioritaire |
|------|-----|------------------------------|
| Salles principales | S1 à S12 | Classe entière (collège prioritaire) |
| Laboratoires | L1, L2 | Demi-classe → tandems PC/SVT ; aussi tronc commun LV2 lycée |
| Polyvalente | Amphi | Troncs communs (hors LV2) ; salle principale d'appoint ; **jamais classe entière doublée** |
| Cour | Terrain | EPS uniquement ; jusqu'à 2 classes simultanées |

### Niveaux et classes (feuille `niveaux`) — 18 classes
- 6ème : 6ème 1, 6ème 2, 6ème 3, 6ème 4
- 5ème : 5ème 1, 5ème 2, 5ème 3
- 4ème : 4ème 1, 4ème 2, 4ème 3
- 3ème : 3ème 1, 3ème 2, 3ème 3, 3ème 4
- 2nde : 2nde A, 2nde C
- 1ère : 1ère A, 1ère D

### Volumes horaires par discipline et classe (feuille `classes`)
Matrice discipline × classe donnant le volume horaire réglementaire à couvrir **exactement**. Total brut 439 h, **total ajusté 470 h** après réévaluation des tandems (voir `tandem`). Disciplines : Allemand, Anglais, EDHC, EPS, Espagnol, Français, HG, Math, PC, Philosophie, SVT.

### Décomposition en séances (feuille `séances`)
Pour chaque niveau et discipline, structure imposée des séances. Exemple : Français 3ème = `2+1+1+1+1` (une séance de 2 h + quatre séances de 1 h), **une seule séance d'une discipline par journée**.

### Enseignants (feuille `profs`) — 27 lignes / 26 personnes
Nom, discipline, code, volume horaire (plafond). Total 470 h. À noter : **SINGO** intervient en double (Allemand + EDHC2), **KOUAME** en double (EDHC + HG). Codes disciplines : ALL, ANG, EDHC, EPS, ESP, FRA, HG, MATH, PHILO, PC, SVT.

### Tandems PC/SVT (feuille `tandem`)
Double comptabilité : la classe compte 1,5 h PC + 1,5 h SVT, mais chaque enseignant effectue 3 h de service. Volume enseignant réajusté : **PC = 54 h, SVT = 49 h**.

---

## 3. Règles métier (contraintes)

### Unicité des ressources
Une classe, un enseignant ou une salle ne peut être affecté qu'à un seul cours par créneau — sauf cas explicites (tronc commun = plusieurs classes ; tandem / LV2 = deux salles pour une classe).

### Affectation des enseignants
- Plafond de service = volume horaire contractuel, **jamais dépassé**.
- **Maximum 3 niveaux différents par cycle** (collège et lycée décomptés séparément).
- **Anti-monopole** : un enseignant ne doit pas avoir toutes les classes d'un même niveau (sauf force majeure justifiée).
- Interdiction de deux enseignants d'une même discipline sur une même classe.
- Pas de chevauchement (un enseignant = une classe à la fois).

### Séquençage pédagogique (anti-surcharge)
- Ne jamais enchaîner deux matières du **groupe Langues** (Français, Anglais, Allemand, Espagnol).
- Ne jamais enchaîner deux matières du **groupe Sciences** (Math, PC, SVT, PC/SVT).
- Aérer en alternant Langues ↔ Sciences/HG/EDHC.
- Pas deux séances de la même discipline le même jour ; **≥ 3 disciplines différentes par journée** pour la valider.
- Éviter qu'une récréation fractionne une séance de 2 h (classe entière) ou un tandem 3 h (fractionnement autorisé exceptionnellement).

### EPS
Bloc unique de 2 h **sur le Terrain**, soit aux 2 premiers créneaux du matin (07h–09h), soit aux 2 derniers de l'après-midi (16h15–18h15).

### Heures creuses
Inévitables mais à placer en fin de matinée ou d'après-midi, **jamais entre deux cours** (pas d'encadrement d'une discipline).

### Tronc commun
Deux classes d'un même niveau, même volume horaire d'une discipline → un seul enseignant, un seul cours. Compté une fois côté enseignant, séparément côté classe.
- 2nde (A+C) : Français, Anglais, HG, LV2 en tronc commun.
- 1ère (A+D) : Anglais, HG en tronc commun.

### LV2 (Allemand / Espagnol)
LV2 = discipline ; Allemand et Espagnol = options.
- Collège : option fixée par classe (4ème 3 / 3ème 3 / 3ème 4 → Allemand ; 4ème 1 / 4ème 2 / 3ème 1 / 3ème 2 → Espagnol).
- Lycée : deux options dans chaque classe → tronc commun par option et par niveau, **deux salles (L1/L2) simultanées avec deux enseignants distincts**.

### Tandems PC/SVT
6ème→4ème : classe scindée en deux demi-groupes, 1,5 h PC + 1,5 h SVT en parallèle puis inversion (3 h service par enseignant). Même principe 2nde A (1ère séance 2 h PC classe entière + 2e séance 1,5 h en tandem).

### Arbitrage en cas de conflit insoluble
Ordre de priorité : **(1)** règle des 3 niveaux max par cycle, puis **(2)** règle anti-monopole. Toute autre difficulté est laissée à l'arbitrage du moteur, qui doit la consigner.

---

## 4. Livrables attendus

| Livrable | Clé de lecture | Contenu de chaque cellule |
|----------|----------------|---------------------------|
| EDT Classes | Nom de la classe | Code discipline + salle — ex. `MATH (S4)` |
| EDT Profs | Nom de l'enseignant | Nom de classe + salle — ex. `6ème 3 (S7)` |
| EDT Salles | Nom de la salle | Nom de classe + code discipline — ex. `3ème 2 (HG)` |
| Rapport | — | Conflits détectés, résolutions, dérogations justifiées, ajustements à appliquer en pratique |

---

## 5. Arborescence cible du projet

```
edt-vatican2/
├── README.md
├── data/
│   └── EDT_data.xlsm          # Source unique des données et règles
├── src/
│   ├── loaders/               # Lecture/parsing des feuilles xlsm
│   │   ├── slots.py           # créneaux (grille 41 h, pauses, mercredi PM)
│   │   ├── rooms.py           # salles
│   │   ├── levels.py          # niveaux + classes
│   │   ├── curriculum.py      # classes (volumes) + séances (découpage)
│   │   ├── teachers.py        # profs (plafonds, codes)
│   │   └── tandems.py         # tandem (double comptabilité)
│   ├── model/                 # Entités du domaine
│   │   ├── entities.py        # Classe, Enseignant, Salle, Discipline, Créneau
│   │   ├── session.py         # Séance (durée, type: entière/tandem/tronc commun/LV2)
│   │   └── timetable.py       # Grille horaire et affectations
│   ├── constraints/           # Règles métier (une par module, testable)
│   │   ├── resource_unicity.py
│   │   ├── teacher_rules.py   # plafond, 3 niveaux/cycle, anti-monopole
│   │   ├── sequencing.py      # anti-enchaînement langues/sciences, 3 disciplines/jour
│   │   ├── eps.py
│   │   ├── common_core.py     # troncs communs
│   │   ├── lv2.py
│   │   └── gaps.py            # heures creuses
│   ├── solver/                # Moteur de génération
│   │   ├── scheduler.py       # orchestration + ordre d'arbitrage (priorité 1 → 2)
│   │   └── arbitration.py     # journalisation des dérogations
│   ├── exporters/             # Génération des livrables
│   │   ├── classes_view.py
│   │   ├── teachers_view.py
│   │   ├── rooms_view.py
│   │   └── report.py          # rapport d'arbitrage
│   └── ui/                    # Composants d'affichage réutilisables
│       ├── grids.py           # rendu des grilles EDT (pandas Styler)
│       └── theme.py           # palette discrète par groupe de disciplines
├── streamlit_app.py           # Point d'entrée Streamlit (à la racine pour Community Cloud)
├── .streamlit/
│   └── config.toml            # Thème sobre (couleurs, police)
├── output/                    # EDT générés + rapport
├── tests/                     # Tests par contrainte et d'intégration
├── requirements.txt
└── packages.txt               # Dépendances système éventuelles (déploiement)
```

> **Note déploiement** : Streamlit Community Cloud lance par défaut le fichier `streamlit_app.py` situé à la racine du repo. On l'y place donc, et il se contente d'importer le solveur et les exporters depuis `src/`.

---

## 6. Pile technique recommandée

- **Backend / solveur** : Python 3.11+, `pandas` + `openpyxl` (lecture xlsm), `OR-Tools` (CP-SAT) pour la satisfaction de contraintes.
- **Interface** : **Streamlit** — interface 100 % Python, sobre et administrative (grilles lisibles via `pandas.Styler`, en-têtes clairs, code couleur discret par groupe de disciplines, boutons d'export). Pas de front-end séparé à maintenir.
- **Hébergement en ligne** : **Streamlit Community Cloud** — déploiement gratuit depuis un repo GitHub, URL publique partageable, aucun serveur local à administrer. Repli possible vers **Gradio + Hugging Face Spaces** si le solveur dépasse les ressources gratuites de Streamlit Cloud (la logique métier reste inchangée).
- **Exports** : xlsx (`openpyxl`) et/ou PDF, directement téléchargeables depuis l'interface via `st.download_button`.
- **Tests** : `pytest`, une suite par contrainte du §3.

### Architecture interface / solveur
Pour ne pas saturer les ressources gratuites, **le solveur et l'interface sont découplés** : la génération OR-Tools tourne une fois et son résultat est mis en cache (`@st.cache_data` / `@st.cache_resource`). L'interface se contente d'**afficher et d'exporter** le résultat caché ; OR-Tools n'est relancé que sur action explicite de l'utilisateur (« Régénérer »).

---

## 7. Style attendu

Interface et exports **propres, simples, administratifs** : pas de fioritures, lisibilité maximale, terminologie de l'établissement (noms de classes, codes disciplines, noms d'enseignants exacts), conventions d'affichage des cellules respectées à la lettre (`CODE (SALLE)`, `CLASSE (SALLE)`, `CLASSE (CODE)`). Tout écart à une règle doit être visible et tracé dans le rapport.

---

## 8. Démarrage (à implémenter)

### En local
```bash
pip install -r requirements.txt

# Générer les EDT en ligne de commande (sans interface)
python -m src.solver.scheduler --data data/EDT_data.xlsm --out output/

# Ou lancer l'interface Streamlit
streamlit run streamlit_app.py
```

Le moteur doit, à la fin : (1) valider qu'aucun volume horaire n'est sous- ou sur-couvert, (2) confirmer l'absence de conflit de ressource, (3) produire les trois vues + le rapport d'arbitrage.

### Mise en ligne (Streamlit Community Cloud)
1. Pousser le projet sur un repo **GitHub** (public ou privé).
2. Vérifier que `requirements.txt` liste bien `streamlit`, `pandas`, `openpyxl`, `ortools`.
3. Sur [share.streamlit.io](https://share.streamlit.io), connecter le repo et indiquer `streamlit_app.py` comme fichier principal.
4. Le déploiement génère une **URL publique** partageable à toute l'administration — aucune installation côté utilisateur.

Toute personne disposant du lien peut alors générer, consulter et télécharger les EDT depuis son navigateur.
