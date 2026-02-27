# QuestForge

Plataforma de estudo orientada por IA com foco em **Active Recall**, **Revisão Espaçada (SRS)** e rotina de estudo consistente.

## Stack

- Backend: Laravel 11 (PHP 8.4)
- Frontend: React 18 (Vite)
- Banco: PostgreSQL 16
- Cache/Fila: Redis 7
- Infra: Docker + Nginx
- IA: Google Gemini API

## Documentação Principal

- Instalação e Deploy: [`docs/INSTALACAO.md`](docs/INSTALACAO.md)
- Visão do Projeto: [`docs/PROJETO.md`](docs/PROJETO.md)
- Índice técnico completo: [`docs/README.md`](docs/README.md)

## Acesso em Produção

- Aplicação: `http://SEU_DOMINIO_OU_IP`
- API: `http://SEU_DOMINIO_OU_IP/api/*`

## Primeiro administrador

Após rodar as migrations, promova um usuário a admin via Tinker:

```bash
docker compose exec app php artisan tinker
```
```php
User::where('email', 'seu@email.com')->update(['is_admin' => true]);
```

## Segurança mínima para produção

- `APP_ENV=production`
- `APP_DEBUG=false`
- `NGINX_PORT=80`
- Firewall permitindo apenas `22`, `80`, `443`
- Portas `5173`, `8000`, `5432`, `6379` sem acesso externo
- Backup de banco **válido** antes de qualquer mudança crítica
