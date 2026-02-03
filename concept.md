# DRIVR

## Concept

DRIVR est une application de type **Strava pour automobile**. Elle permet aux utilisateurs de partager leurs sessions de conduite avec leurs amis ou la communauté.

---

## Fonctionnalités principales

### Enregistrement de session

L'utilisateur lance un enregistrement via un bouton dédié. L'application traque en temps réel :

- [x] Trajet effectué (tracé GPS)
- [x] Vitesse actuelle
- [x] Vitesse moyenne
- [x] Vitesse maximale
- [x] Durée de la session
- [x] Point de départ et d'arrivée
- [x] Distance parcourue en kilomètres
- [x] Visualisation en temps réel du chemin parcouru sur la carte

### Gestion des véhicules

- [x] Association d'un véhicule au compte utilisateur
- [x] Vérification qu'un véhicule est associé avant de lancer une session

### Segments

- [x] Affichage des segments sur lieux reconnus (cols, autoroutes, nationales)
- [x] Création de segments personnalisés par les utilisateurs
- [ ] Détection automatique du passage sur un segment pendant une session
- [ ] Calcul et enregistrement des performances sur les segments
- [x] Classement des meilleurs temps par segment
- [ ] Autres types de classements (à définir)

---

## MVP

### Authentification

- [x] Création de compte
- [x] Connexion sécurisée
- [x] Déconnexion
- [x] Routes protégées par token (PASETO)
- [x] Refresh token
- [x] Validation des inputs (email, password)

### Véhicules

- [x] Modèle de données véhicule
- [x] Endpoint création véhicule
- [x] Endpoint liste des véhicules de l'utilisateur
- [x] Endpoint suppression véhicule
- [x] Endpoint modification véhicule
- [x] Limitation à un seul véhicule (modèle freemium - futur)

### Sessions de conduite

#### Backend

- [x] Modèle de données session
- [x] Endpoint création session
- [x] Endpoint mise à jour session (pause/reprise)
- [x] Endpoint finalisation session
- [x] Calcul des statistiques (vitesse moy, max, distance, durée)
- [x] Endpoint récupération des sessions d'un utilisateur
- [x] Endpoint récupération d'une session par ID
- [x] Gestion de la visibilité (privé/public)
- [x] Mise à jour des stats globales utilisateur
- [x] Mise à jour des stats globales véhicule

#### Frontend

- [x] Écran de lancement de session
- [x] Tracking GPS en arrière-plan
- [x] Affichage temps réel des données (vitesse, durée, distance)
- [x] Affichage du tracé sur la carte
- [x] Bouton pause/reprise
- [x] Bouton arrêt
- [x] Écran récapitulatif post-session
- [x] Choix visibilité (privé/public)
- [x] Confirmation et publication

### Social

- [x] Modèle de données relation d'amitié
- [x] Endpoint envoi demande d'ami
- [x] Endpoint accepter/refuser demande
- [x] Endpoint liste des amis
- [x] Endpoint supprimer un ami
- [x] Modèle de données commentaire
- [x] Endpoint ajouter commentaire sur une session
- [x] Endpoint supprimer commentaire
- [x] Modèle de données like
- [x] Endpoint liker/unliker une session
- [x] Feed des sessions des amis

---

## Stack technique

### Base de données

- [x] Setup Docker PostgreSQL
- [x] Création du dossier `database/`
- [x] Script SQL création table `users`
- [x] Script SQL création table `vehicles`
- [x] Script SQL création table `sessions`
- [x] Script SQL création table `session_points` (données GPS)
- [x] Script SQL création table `friendships`
- [x] Script SQL création table `comments`
- [x] Script SQL création table `likes`
- [x] Script SQL création table `segments`
- [x] Script SQL création table `segment_records`

### Backend

- [x] Setup projet Fastify
- [x] Configuration PASETO
- [x] Middleware d'authentification
- [x] Connexion à PostgreSQL
- [x] Structure des routes
- [x] Validation des requêtes (Zod)
- [x] Gestion des erreurs centralisée
- [x] Documentation API (Swagger/OpenAPI)

### Frontend

- [x] Setup projet React Native (Expo)
- [x] Navigation (Expo Router)
- [x] Gestion d'état (Zustand)
- [x] Service de géolocalisation
- [x] Service de tracking en arrière-plan
- [x] Intégration carte (MapView)
- [x] Gestion du stockage local (tokens)
- [x] Appels API centralisés

### DevOps

- [x] Makefile avec commandes principales
- [x] Commande `make db-up` (lancer PostgreSQL)
- [x] Commande `make db-down` (arrêter PostgreSQL)
- [x] Commande `make db-reset` (reset BDD)
- [x] Commande `make api-dev` (lancer backend en dev)
- [x] Commande `make mobile-dev` (lancer app React Native)
- [x] Docker Compose (PostgreSQL + API)
- [x] Variables d'environnement (.env)

---

## Structure du projet

```
drivr/
├── api/                          # Backend Fastify
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── lib/                  # Utilitaires (auth, db, errors)
│   │   ├── middleware/           # Middlewares
│   │   └── routes/               # Routes API
│   │       ├── auth/             # Authentification
│   │       ├── users/            # Utilisateurs
│   │       ├── vehicles/         # Véhicules
│   │       ├── sessions/         # Sessions de conduite
│   │       ├── segments/         # Segments
│   │       └── social/           # Social (amis, likes, commentaires)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── mobile/                       # App React Native (Expo)
│   ├── app/                      # Screens (Expo Router)
│   │   ├── (auth)/               # Screens d'authentification
│   │   ├── (tabs)/               # Tabs principales
│   │   └── session/              # Screens de session
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── lib/                  # API client, storage
│   │   ├── services/             # Services (location)
│   │   ├── stores/               # Zustand stores
│   │   └── theme/                # Thème et couleurs
│   ├── app.json
│   └── package.json
│
├── database/
│   └── migrations/               # Scripts SQL
│
├── docker-compose.yml            # Services Docker
├── Makefile                      # Commandes de développement
└── .env.example                  # Variables d'environnement
```

---

## À définir plus tard

- [ ] Système d'abonnement premium
- [ ] Limitation véhicules selon abonnement
- [ ] Nouveaux types de classements segments
- [ ] Notifications push
- [ ] Partage sur réseaux sociaux
- [ ] Mode convoi (sessions groupées)
- [ ] Achievements / badges
