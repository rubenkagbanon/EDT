# EDT Pro - Planificateur d'Emplois du Temps Automatique

Système professionnel de génération automatique d'emplois du temps scolaires pour le secondaire, utilisant des contraintes de programmation linéaire avec Google OR-Tools.

## Caractéristiques

✅ **Génération automatique** : Résolution des emplois du temps via algorithme CP-SAT
✅ **Contraintes dures** : Respect strict des indisponibilités, salles, effectifs
✅ **Optimisation** : Minimisation des trous, équilibre des charges
✅ **Interface intuitive** : Application Streamlit prête à l'emploi
✅ **Exports** : Excel et PDF généré automatiquement
✅ **Données flexibles** : JSON ou Excel comme source

## Architecture

```
projet/
├── models/
│   ├── entities.py          # Classes de données (Teacher, Room, Course)
│   ├── data_loader.py       # Chargeur JSON/Excel
│   └── __init__.py
├── solver/
│   ├── schedule_solver.py   # Moteur OR-Tools
│   └── __init__.py
├── export/
│   ├── exporter.py          # Export Excel/PDF
│   └── __init__.py
├── data/
│   ├── config.json          # Configuration (jours, heures)
│   ├── teachers.json        # Professeurs
│   ├── classes.json         # Classes
│   ├── rooms.json           # Salles
│   └── courses.json         # Cours
├── app.py                   # Interface Streamlit principale
├── requirements.txt         # Dépendances Python
└── README_EDT.md           # Ce fichier
```

## Installation

### Prérequis
- Python 3.10+
- pip

### Étapes

1. **Cloner ou placer le projet**
```bash
cd projet/
```

2. **Créer un environnement virtuel**
```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate     # Windows
```

3. **Installer les dépendances**
```bash
pip install -r requirements.txt
```

## Utilisation

### Lancer l'application

```bash
streamlit run app.py
```

L'interface s'ouvrira automatiquement sur `http://localhost:8501`

### Étapes dans l'interface

1. **Vérifier les données** : Les fichiers JSON de `data/` sont automatiquement chargés
2. **Cliquer sur "Générer l'EDT"** : Résolution via OR-Tools (30s par défaut)
3. **Consulter l'EDT** : Par classe, professeur, salle ou vue globale
4. **Exporter** : Excel ou PDF avec mise en page professionnelle

## Format des Données

### config.json
```json
{
  "days": ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
  "time_slots": [8, 9, 10, 11, 13, 14, 15, 16],
  "lunch_break": [12, 13],
  "school_name": "Lycée Saint-Louis",
  "academic_year": "2024-2025"
}
```

### teachers.json
```json
[
  {
    "id": "PROF001",
    "name": "Marie Dubois",
    "subjects": ["Mathématiques"],
    "unavailable_slots": [
      {"day": "Vendredi", "time": 16}
    ],
    "max_hours_per_week": 35
  }
]
```

### classes.json
```json
[
  {
    "id": "6A",
    "name": "6ème A",
    "level": "6",
    "student_count": 28,
    "preferred_morning_courses": ["Mathématiques", "Français"]
  }
]
```

### rooms.json
```json
[
  {
    "id": "ROOM101",
    "name": "Salle 101",
    "capacity": 30,
    "type": "normal",
    "compatible_subjects": []
  },
  {
    "id": "LAB201",
    "name": "Laboratoire Sciences",
    "capacity": 24,
    "type": "labo",
    "compatible_subjects": ["Sciences Physiques"]
  }
]
```

### courses.json
```json
[
  {
    "id": "COURS001",
    "subject": "Mathématiques",
    "teacher_id": "PROF001",
    "class_id": "6A",
    "hours_per_week": 4,
    "preferred_times": []
  }
]
```

## Contraintes Implémentées

### Contraintes Dures (Obligatoires)
- ✅ Un professeur ne peut pas enseigner 2 classes simultanément
- ✅ Une salle ne peut accueillir qu'un cours par créneau
- ✅ Respect strict des indisponibilités professeurs
- ✅ Une classe ne peut avoir qu'un cours par créneau
- ✅ Compatibilité salle ↔ matière respectée
- ✅ Respect des volumes horaires

### Contraintes Souples (Optimisation)
- 📊 Minimiser les trous dans les emplois du temps
- 📊 Équilibrer la charge horaire des classes
- 📊 Prioriser les cours le matin (optionnel par classe)

## Solveur OR-Tools

Le cœur du système utilise **Google OR-Tools CP-SAT**, un solveur de programmation par contraintes capable de:
- Gérer 100+ variables booléennes
- Résoudre en < 1 minute pour un collège
- Trouver des solutions quasi-optimales

### Paramètres de résolution
- **Temps limite** : 5-120s (ajustable dans l'interface)
- **Threads** : Automatique
- **Logging** : Désactivé pour les performances

## Export

### Excel
- **4 feuilles** : Résumé, Classes, Professeurs, Salles
- **Formatage** : Headers colorés, largeurs optimales
- **Utilité** : Impression facile, distribution par établissement

### PDF
- **En-tête** : Infos écoles, date génération
- **Corps** : Emplois du temps par classe
- **Pages** : Break automatique par classe
- **Impression** : Format A4, lisible

## Améliorations Futures (V2)

### Court terme
- 🔧 Importer depuis Excel directement dans l'UI
- 🔧 Gestion d'utilisateurs (admin/profs)
- 🔧 Contraintes de déplacements (classes/profs dispersées)
- 🔧 Historique des générations

### Moyen terme
- 🚀 Base de données (Supabase) pour persistence
- 🚀 API REST pour intégration systèmes écoles
- 🚀 Multi-semaines / vacances scolaires
- 🚀 Gestion d'échanges de cours post-génération

### Long terme
- 📱 Application mobile (professeurs/élèves)
- 📊 Analytics d'optimisation (utilisation salles, etc.)
- 🔗 SSO Activité Directory pour établissements
- ⚡ Support multi-sites / multi-écoles

## Dépannage

### "Impossible de générer un emploi du temps valide"
**Cause** : Contraintes contradictoires
**Solutions** :
1. Vérifier pas d'erreurs dans les données
2. Augmenter le temps de résolution
3. Diminuer les heures/semaine
4. Ajouter des salles

### Application très lente
**Solutions** :
1. Réduire le nombre de cours/semaine
2. Utiliser moins de salles
3. Réduire le nombre de jours

### Erreur "Fichiers manquants"
**Solutions** :
1. Vérifier que `data/` existe
2. Placer les 5 fichiers JSON requis
3. Relancer l'application

## Prérequis Serveur

Pour déployer en production sur un serveur établissement:

```bash
# Installation système
sudo apt-get install python3.10 python3-pip

# Clone du projet
git clone <url> /opt/edt-pro
cd /opt/edt-pro

# Setup
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Lancer sur port 8501 accessible réseau
streamlit run app.py \
  --server.port 8501 \
  --server.address 0.0.0.0 \
  --logger.level=warning
```

## Support & Documentation

Pour des questions ou améliorations :
- Consulter les fichiers de données d'exemple
- Tester avec les données fournies d'abord
- Adapter progressivement à votre établissement

## Licence

Projet éducatif open-source
