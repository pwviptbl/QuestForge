#!/bin/bash
# ─────────────────────────────────────────────────────────────
# deploy.sh — Script de deploy do QuestForge na VPS
# Uso: ./deploy.sh
# ─────────────────────────────────────────────────────────────
set -e

echo ""
echo "🚀 QuestForge — Deploy iniciado"
echo "────────────────────────────────────"

# ─── 1. Atualiza o código ─────────────────────────────────────
echo "📦 Atualizando código do repositório..."
git pull origin main

# ─── 2. Build e reinicialização dos containers ────────────────
echo "🐳 Fazendo rebuild dos containers..."
docker compose down
docker compose build --no-cache app
docker compose up -d

# ─── 3. Aguarda o banco ficar pronto ─────────────────────────
echo "⏳ Aguardando banco de dados..."
sleep 10

# ─── 4. Instala dependências PHP dentro do container ─────────
echo "📚 Instalando dependências do Composer..."
docker compose exec app composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

# ─── 5. Chave da aplicação ───────────────────────────────────
echo "🔑 Gerando chave da aplicação..."
docker compose exec app php artisan key:generate --force

# ─── 6. Roda migrations ──────────────────────────────────────
echo "🗄️  Executando migrations..."
docker compose exec app php artisan migrate --force

# ─── 7. Otimização Laravel para produção ─────────────────────
echo "⚡ Otimizando para produção..."
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan view:cache
docker compose exec app php artisan event:cache

# ─── 8. Ajusta permissões de storage ─────────────────────────
echo "🔒 Ajustando permissões..."
docker compose exec -u root app chmod -R 777 storage bootstrap/cache

echo ""
echo "✅ Deploy concluído com sucesso!"
echo "🌐 Acesse: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
