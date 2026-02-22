# Instalação e Deploy

## Pré-requisitos

- Docker >= 24
- Docker Compose >= 2.x
- Git

## 1) Clonar o projeto

```bash
git clone https://github.com/seu-usuario/questforge.git
cd questforge
```

## 2) Preparar variáveis de ambiente

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Ajuste os principais valores:

- `.env` (raiz):
  - `NGINX_PORT=80`
  - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `backend/.env`:
  - `APP_ENV=production`
  - `APP_DEBUG=false`
  - `APP_URL=http://SEU_DOMINIO_OU_IP`
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=db`
  - `DB_PORT=5432`
  - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (mesmos da raiz)
  - `GEMINI_API_KEY=...`

## 3) Subir containers

```bash
docker compose up -d --build
```

## 4) Inicialização Laravel

```bash
docker compose exec app php artisan key:generate --force
docker compose exec app php artisan migrate --force
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan config:cache
```

## 5) Verificação

```bash
docker compose ps
curl -I http://127.0.0.1/api/health
```

Resultado esperado:

- `HTTP/1.1 200 OK` no healthcheck
- `nginx`, `app`, `db`, `redis`, `frontend` em `Up`

## Operação: trocar senha do PostgreSQL sem perder dados

Com volume já existente, **não basta mudar `DB_PASSWORD` no `.env`**.

1. Fazer backup válido:

```bash
docker compose exec -T db pg_dump -U questforge questforge > backup_$(date +%F_%H%M).sql
test -s backup_$(date +%F_%H%M).sql
```

2. Alterar senha no banco:

```bash
docker compose exec db psql -U questforge -d postgres
```

Dentro do `psql`:

```sql
\password questforge
\q
```

3. Atualizar senha em ambos:

- `.env`
- `backend/.env`

4. Recriar `app` para aplicar env de container:

```bash
docker compose up -d --force-recreate app
```

5. Recarregar config Laravel:

```bash
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan config:cache
```

## Recuperação rápida

### 502 Bad Gateway

- Verifique config Nginx (`/api` deve ir para Laravel via FastCGI com `app:9000`)
- Recrie Nginx:

```bash
docker compose up -d --force-recreate nginx
```

### `No application encryption key has been specified`

```bash
docker compose exec app php artisan key:generate --force
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan config:cache
docker compose up -d --force-recreate app
```

### Backup inválido

Valide sempre o dump antes de mudanças destrutivas:

```bash
ls -lh backup_*.sql
```

Arquivos com poucos bytes ou `0` bytes não servem para restore.
