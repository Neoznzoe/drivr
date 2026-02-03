# DRIVR 🚗

**Strava pour automobile** - Partagez vos sessions de conduite avec vos amis et la communauté.

## Fonctionnalités

- 📍 **Tracking GPS en temps réel** - Enregistrez vos trajets avec vitesse, distance et durée
- 🚙 **Gestion des véhicules** - Associez vos véhicules à votre compte
- 🏁 **Segments** - Créez et parcourez des segments (cols, autoroutes, routes)
- 🏆 **Classements** - Comparez vos performances sur les segments
- 👥 **Social** - Amis, likes, commentaires et feed d'activité
- 🗺️ **Cartographie** - Visualisez vos trajets sur une carte interactive

---

## Prérequis

- [Node.js](https://nodejs.org/) >= 20.x
- [Docker](https://www.docker.com/) et Docker Compose
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (pour le mobile)
- iOS Simulator / Android Emulator (ou appareil physique)

---

## Installation rapide

```bash
# 1. Cloner le projet
git clone https://github.com/votre-username/drivr.git
cd drivr

# 2. Copier les fichiers d'environnement
cp .env.example .env
cp api/.env.example api/.env
cp mobile/.env.example mobile/.env

# 3. Installer les dépendances
make install

# 4. Lancer la base de données
make db-up

# 5. Lancer l'API (dans un terminal)
make api-dev

# 6. Lancer l'app mobile (dans un autre terminal)
make mobile-dev
```

---

## Commandes de développement

### Makefile (raccourcis)

```bash
make help          # Affiche toutes les commandes disponibles
make install       # Installe toutes les dépendances (api + mobile)
```

### Base de données

```bash
make db-up         # Démarre PostgreSQL (Docker)
make db-down       # Arrête PostgreSQL
make db-reset      # Reset complet de la BDD (supprime les données)
make db-logs       # Affiche les logs PostgreSQL
make db-shell      # Ouvre un shell psql
```

### Backend API

```bash
make api-dev       # Lance l'API en mode développement (hot reload)
make api-build     # Build l'API pour la production
make api-test      # Lance les tests
make api-lint      # Lint du code
```

### Application Mobile

```bash
make mobile-dev    # Lance Expo (scannez le QR code)
make mobile-ios    # Lance sur iOS Simulator
make mobile-android # Lance sur Android Emulator
make mobile-lint   # Lint du code
```

### Docker

```bash
make docker-up     # Lance tous les services (PostgreSQL + API)
make docker-down   # Arrête tous les services
make docker-logs   # Affiche les logs
make docker-build  # Build les images Docker
```

---

## URLs importantes

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000 | Backend REST API |
| Swagger | http://localhost:3000/docs | Documentation interactive |
| Health | http://localhost:3000/health | Health check |
| PostgreSQL | localhost:5432 | Base de données |

---

## Architecture du projet

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

## Stack Technique

### Backend
| Technologie | Utilisation |
|-------------|-------------|
| [Fastify](https://www.fastify.io/) | Framework web Node.js |
| TypeScript | Typage statique |
| [PASETO](https://paseto.io/) | Tokens d'authentification |
| [Zod](https://zod.dev/) | Validation des données |
| Swagger | Documentation API |

### Base de données
| Technologie | Utilisation |
|-------------|-------------|
| PostgreSQL 15 | SGBD relationnel |
| PostGIS | Extension géospatiale |
| Docker | Conteneurisation |

### Mobile
| Technologie | Utilisation |
|-------------|-------------|
| React Native | Framework mobile |
| [Expo](https://expo.dev/) | Tooling et build |
| [Expo Router](https://docs.expo.dev/router/introduction/) | Navigation |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| react-native-maps | Cartographie |
| expo-location | GPS et tracking |

---

## API Endpoints

### Authentification (`/api/v1/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/register` | Créer un compte |
| `POST` | `/login` | Se connecter |
| `POST` | `/logout` | Se déconnecter |
| `POST` | `/refresh` | Rafraîchir le token |
| `GET` | `/me` | Infos utilisateur connecté |

### Véhicules (`/api/v1/vehicles`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/` | Liste des véhicules |
| `POST` | `/` | Créer un véhicule |
| `GET` | `/:id` | Détails d'un véhicule |
| `PATCH` | `/:id` | Modifier un véhicule |
| `DELETE` | `/:id` | Supprimer un véhicule |
| `POST` | `/:id/set-primary` | Définir comme principal |

### Sessions (`/api/v1/sessions`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/` | Liste des sessions |
| `POST` | `/` | Démarrer une session |
| `GET` | `/:id` | Détails d'une session |
| `POST` | `/:id/points` | Ajouter un point GPS |
| `POST` | `/:id/points/batch` | Ajouter plusieurs points |
| `POST` | `/:id/pause` | Mettre en pause |
| `POST` | `/:id/resume` | Reprendre |
| `POST` | `/:id/complete` | Terminer |
| `DELETE` | `/:id/cancel` | Annuler |

### Segments (`/api/v1/segments`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/` | Liste des segments |
| `POST` | `/` | Créer un segment |
| `GET` | `/:id` | Détails d'un segment |
| `GET` | `/:id/leaderboard` | Classement |
| `GET` | `/:id/my-records` | Mes records |

### Social (`/api/v1/social`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/feed` | Feed d'activité |
| `GET` | `/friends` | Liste des amis |
| `GET` | `/friends/requests` | Demandes reçues |
| `POST` | `/friends/request` | Envoyer une demande |
| `POST` | `/friends/accept/:id` | Accepter |
| `POST` | `/friends/reject/:id` | Refuser |
| `DELETE` | `/friends/:userId` | Supprimer un ami |
| `POST` | `/sessions/:id/like` | Liker |
| `DELETE` | `/sessions/:id/like` | Unliker |
| `GET` | `/sessions/:id/comments` | Commentaires |
| `POST` | `/sessions/:id/comments` | Commenter |
| `DELETE` | `/comments/:id` | Supprimer commentaire |

---

## Base de données

### Tables

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs et stats globales |
| `refresh_tokens` | Tokens de rafraîchissement |
| `vehicles` | Véhicules des utilisateurs |
| `sessions` | Sessions de conduite |
| `session_points` | Points GPS des sessions |
| `segments` | Segments de route |
| `segment_records` | Records sur les segments |
| `friendships` | Relations d'amitié |
| `likes` | Likes sur les sessions |
| `comments` | Commentaires sur les sessions |

### Commandes utiles

```bash
# Accéder à PostgreSQL
make db-shell

# Lister les tables
\dt

# Voir le schéma d'une table
\d users
\d sessions

# Requête SQL
SELECT * FROM users;

# Quitter
\q
```

---

## Variables d'environnement

### `.env` (racine)

```env
# Database
POSTGRES_USER=drivr
POSTGRES_PASSWORD=drivr_secret
POSTGRES_DB=drivr
POSTGRES_PORT=5432

# API
API_PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-in-production
PASETO_SECRET_KEY=your-paseto-secret-key-32-bytes-min
```

### `api/.env`

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://drivr:drivr_secret@localhost:5432/drivr
JWT_SECRET=your-jwt-secret-key-min-32-chars
PASETO_SECRET_KEY=your-paseto-secret-key-32-bytes-min
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

### `mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

> ⚠️ **Note** : Pour tester sur un appareil physique, remplacez `localhost` par l'IP de votre machine (ex: `http://192.168.1.100:3000/api/v1`).

---

## Tester l'API

### Avec curl

```bash
# Health check
curl http://localhost:3000/health

# Créer un compte
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "username": "testuser"
  }'

# Se connecter
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'

# Utiliser le token retourné pour les requêtes authentifiées
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <votre_token>"
```

### Avec Swagger

Ouvrez http://localhost:3000/docs dans votre navigateur pour accéder à la documentation interactive.

---

## Déploiement

### Production avec Docker

```bash
# Build et lancement
docker-compose up -d --build

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### Build mobile

```bash
cd mobile

# Avec EAS Build (recommandé)
npx eas build --platform ios
npx eas build --platform android

# Build local
npx expo build:ios
npx expo build:android
```

---

## Troubleshooting

### La base de données ne démarre pas

```bash
# Vérifier les logs
make db-logs

# Reset complet
make db-reset
```

### L'API ne se connecte pas à PostgreSQL

```bash
# Vérifier que PostgreSQL est lancé
docker ps

# Vérifier la variable DATABASE_URL dans api/.env
```

### L'app mobile ne se connecte pas à l'API

1. Vérifier que l'API est lancée (`curl http://localhost:3000/health`)
2. Sur appareil physique : remplacer `localhost` par l'IP de votre machine
3. Vérifier `EXPO_PUBLIC_API_URL` dans `mobile/.env`

---

## Licence

MIT
