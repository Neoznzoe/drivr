.PHONY: help install db-up db-down db-reset db-logs api-dev api-build api-test mobile-dev mobile-ios mobile-android lint clean

# Colors
GREEN  := \033[0;32m
YELLOW := \033[0;33m
NC     := \033[0m

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ============================================
# Installation
# ============================================

install: ## Installe toutes les dépendances
	@echo "$(YELLOW)Installation des dépendances API...$(NC)"
	cd api && npm install
	@echo "$(YELLOW)Installation des dépendances Mobile...$(NC)"
	cd mobile && npm install
	@echo "$(GREEN)Installation terminée!$(NC)"

# ============================================
# Database
# ============================================

db-up: ## Lance PostgreSQL via Docker
	@echo "$(YELLOW)Démarrage de PostgreSQL...$(NC)"
	docker-compose up -d postgres
	@echo "$(GREEN)PostgreSQL démarré sur le port 5432$(NC)"

db-down: ## Arrête PostgreSQL
	@echo "$(YELLOW)Arrêt de PostgreSQL...$(NC)"
	docker-compose down
	@echo "$(GREEN)PostgreSQL arrêté$(NC)"

db-reset: ## Reset complet de la base de données
	@echo "$(YELLOW)Reset de la base de données...$(NC)"
	docker-compose down -v
	docker-compose up -d postgres
	@echo "$(GREEN)Base de données réinitialisée$(NC)"

db-logs: ## Affiche les logs PostgreSQL
	docker-compose logs -f postgres

db-shell: ## Ouvre un shell PostgreSQL
	docker-compose exec postgres psql -U drivr -d drivr

# ============================================
# API
# ============================================

api-dev: ## Lance l'API en mode développement
	@echo "$(YELLOW)Démarrage de l'API en mode dev...$(NC)"
	cd api && npm run dev

api-build: ## Build l'API
	@echo "$(YELLOW)Build de l'API...$(NC)"
	cd api && npm run build

api-test: ## Lance les tests de l'API
	cd api && npm test

api-lint: ## Lint du code API
	cd api && npm run lint

# ============================================
# Mobile
# ============================================

mobile-dev: ## Lance l'app mobile (Expo)
	@echo "$(YELLOW)Démarrage de l'app mobile...$(NC)"
	cd mobile && npm start

mobile-ios: ## Lance l'app sur iOS
	cd mobile && npm run ios

mobile-android: ## Lance l'app sur Android
	cd mobile && npm run android

mobile-lint: ## Lint du code mobile
	cd mobile && npm run lint

# ============================================
# Docker
# ============================================

docker-up: ## Lance tous les services Docker
	@echo "$(YELLOW)Démarrage de tous les services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services démarrés$(NC)"

docker-down: ## Arrête tous les services Docker
	docker-compose down

docker-logs: ## Affiche les logs de tous les services
	docker-compose logs -f

docker-build: ## Build les images Docker
	docker-compose build

# ============================================
# Utils
# ============================================

clean: ## Nettoie les fichiers générés
	@echo "$(YELLOW)Nettoyage...$(NC)"
	rm -rf api/dist
	rm -rf api/node_modules
	rm -rf mobile/node_modules
	rm -rf mobile/.expo
	@echo "$(GREEN)Nettoyage terminé$(NC)"

lint: api-lint mobile-lint ## Lint tout le code
