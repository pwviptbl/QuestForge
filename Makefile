# ─────────────────────────────────────────────────────────────
# Makefile — Comandos de desenvolvimento QuestForge
# Uso: make <comando>
# ─────────────────────────────────────────────────────────────

.PHONY: help up down build restart logs shell migrate seed fresh key test fe-shell fe-install fe-build fe-logs

# ─── Ajuda ────────────────────────────────────────────────────
help:
	@echo ""
	@echo "🚀 QuestForge — Comandos disponíveis:"
	@echo ""
	@echo "  === CONTAINERS ==="
	@echo "  make up          — Sobe todos os containers"
	@echo "  make down        — Para todos os containers"
	@echo "  make build       — Build/rebuild da imagem PHP"
	@echo "  make restart     — Reinicia todos os containers"
	@echo "  make logs        — Exibe logs em tempo real"
	@echo ""
	@echo "  === BACKEND (Laravel) ==="
	@echo "  make shell       — Shell dentro do container PHP"
	@echo "  make key         — Gera APP_KEY do Laravel"
	@echo "  make install     — Instala dependências Composer"
	@echo "  make migrate     — Roda as migrations"
	@echo "  make fresh       — Drop+recria banco + seeds"
	@echo "  make seed        — Roda os seeders"
	@echo "  make artisan CMD='...' — Roda comando Artisan personalizado"
	@echo "  make test        — Roda os testes PHPUnit"
	@echo ""
	@echo "  === FRONTEND (React/Vite) ==="
	@echo "  make fe-shell    — Shell dentro do container Node"
	@echo "  make fe-install  — Instala dependências npm"
	@echo "  make fe-build    — Build de produção do frontend"
	@echo "  make fe-logs     — Logs do container frontend"
	@echo ""

# ─── Containers ───────────────────────────────────────────────
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache app

restart:
	docker compose restart

logs:
	docker compose logs -f

# ─── Laravel ──────────────────────────────────────────────────
shell:
	docker compose exec app bash

key:
	docker compose exec app php artisan key:generate

install:
	docker compose exec app composer install

migrate:
	docker compose exec app php artisan migrate

fresh:
	docker compose exec app php artisan migrate:fresh --seed

seed:
	docker compose exec app php artisan db:seed

artisan:
	docker compose exec app php artisan $(CMD)

test:
	docker compose exec app php artisan test

# ─── Frontend ─────────────────────────────────────────────────
fe-shell:
	docker compose exec frontend sh

fe-install:
	docker compose exec frontend npm install

fe-build:
	docker compose exec frontend npm run build

fe-logs:
	docker compose logs -f frontend

# ─── Utilitários ─────────────────────────────────────────────
clear-cache:
	docker compose exec app php artisan cache:clear
	docker compose exec app php artisan config:clear
	docker compose exec app php artisan route:clear
	docker compose exec app php artisan view:clear

# ─── Inicialização completa (primeira vez) ────────────────────
init: up
	@echo "⏳ Aguardando banco de dados e frontend inicializarem..."
	@sleep 20
	@$(MAKE) key
	@$(MAKE) migrate
	@echo "✅ QuestForge pronto!"
	@echo "   → API:      http://localhost:8000"
	@echo "   → Frontend: http://localhost:5173"
