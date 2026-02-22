# 🎯 QuestForge

> Plataforma de estudo orientada a IA com foco em **Active Recall**, **Revisão Espaçada** e **mitigação de dispersão**.

**Backend:** Laravel 11 (PHP 8.4) | **Frontend:** React 18 (Vite) | **IA:** Google Gemini API | **Infra:** Docker

---

## 📋 Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) `>= 24`
- [Docker Compose](https://docs.docker.com/compose/install/) `>= 2.x`
- [Git](https://git-scm.com/)
- [Make](https://www.gnu.org/software/make/) *(opcional, mas recomendado)*

---

## 🚀 Instalação e Primeira Execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/questforge.git
cd questforge
```

### 2. Configure as variáveis de ambiente

```bash
# Copie o .env de exemplo para o backend
cp backend/.env.example backend/.env
```

> Edite `backend/.env` e preencha pelo menos:
> - `GEMINI_API_KEY` — sua chave da [Google AI Studio](https://aistudio.google.com/)
> - Ajuste `DB_PASSWORD` se quiser senha customizada

### 3. Suba os containers e inicialize o projeto

**Usando Make (recomendado):**

```bash
make init
```

**Ou manualmente:**

```bash
# Build e subida dos containers
docker compose up -d --build

# Aguardar o PostgreSQL inicializar (~15 segundos)
sleep 15

# Gerar a chave da aplicação Laravel
docker compose exec app php artisan key:generate

# Rodar as migrations do banco de dados
docker compose exec app php artisan migrate
```

### 4. Acesse a aplicação

#### Produção (docker-compose.yml)

| Serviço         | URL / Host              | Acesso        |
|-----------------|------------------------|---------------|
| **Aplicação**   | http://localhost       | Frontend + API |
| **PostgreSQL**  | localhost:5432         | Apenas local  |
| **Redis**       | localhost:6379         | Apenas local  |

> **Frontend** e **Backend** são servidos pelo Nginx na porta 80.
> Rotas `/api/*` são direcionadas ao Laravel, demais rotas ao React.

#### Desenvolvimento (docker-compose.dev.yml)

| Serviço         | URL / Host              |
|-----------------|------------------------|
| **Frontend**    | http://localhost:5173  |
| **API Laravel** | http://localhost:8000  |
| **PostgreSQL**  | localhost:5432         |
| **Redis**       | localhost:6379         |

```bash
# Para rodar em modo desenvolvimento (com hot reload)
docker-compose -f docker-compose.dev.yml up -d
```

---

## 🛠️ Comandos do Dia a Dia

| Comando             | Descrição                              |
|---------------------|----------------------------------------|
| `make up`           | Sobe todos os containers               |
| `make down`         | Para todos os containers               |
| `make build`        | Rebuild da imagem PHP                  |
| `make restart`      | Reinicia os containers                 |
| `make logs`         | Logs em tempo real                     |
| `make shell`        | Abre shell dentro do container PHP     |
| `make migrate`      | Roda as migrations                     |
| `make fresh`        | Drop + recria o banco (+ seeds)        |
| `make seed`         | Roda os seeders                        |
| `make test`         | Roda os testes PHPUnit                 |
| `make clear-cache`  | Limpa todos os caches do Laravel       |
| `make artisan CMD=` | Roda qualquer comando Artisan          |

**Exemplo de `make artisan`:**

```bash
make artisan CMD='route:list'
make artisan CMD='make:controller MeuController'
```

---

## 🐳 Containers Docker

### Produção (docker-compose.yml)

| Container              | Imagem                    | Porta Exposta | Acesso     |
|------------------------|---------------------------|---------------|------------|
| `questforge_nginx`     | nginx:1.27-alpine         | **80**        | ✅ Pública |
| `questforge_frontend`  | Node 22 + Nginx (build)   | —             | ❌ Interna |
| `questforge_app`       | PHP 8.4-FPM (custom)      | —             | ❌ Interna |
| `questforge_db`        | postgres:16-alpine        | 5432 (localhost) | ❌ Interna |
| `questforge_redis`     | redis:7-alpine            | 6379 (localhost) | ❌ Interna |

> ✅ **Arquitetura Segura**: Apenas o Nginx é acessível publicamente.  
> Frontend e Backend não têm portas expostas.

### Desenvolvimento (docker-compose.dev.yml)

| Container              | Imagem                 | Porta Exposta |
|------------------------|------------------------|--------------|
| `questforge_nginx_dev` | nginx:1.27-alpine      | 8000          |
| `questforge_frontend_dev` | node:22-alpine (dev)| 5173          |
| `questforge_app_dev`   | PHP 8.4-FPM (custom)   | —             |
| `questforge_db`        | postgres:16-alpine     | 5432          |
| `questforge_redis`     | redis:7-alpine         | 6379          |

---

## 📂 Estrutura do Projeto

```
questforge/
├── backend/          # Aplicação Laravel 11
├── frontend/         # Aplicação React 18 + Vite (Fase 4)
├── docker/
│   ├── nginx/
│   │   └── default.conf    # Configuração do Nginx
│   └── php/
│       ├── Dockerfile      # Imagem PHP 8.4-FPM customizada
│       └── local.ini       # Configurações PHP customizadas
├── docs/             # Documentação completa do projeto
├── docker-compose.yml
├── Makefile          # Atalhos de comandos
├── deploy.sh         # Script de deploy para VPS
└── README.md
```

---

## 🖥️ Deploy na VPS

### Modo Produção (Recomendado)

**Características:**
- Frontend buildado como arquivos estáticos otimizados
- Nginx como gateway único na porta 80
- Sem dev servers rodando
- Máxima performance e segurança

```bash
# Clone o repositório na VPS
git clone https://github.com/seu-usuario/questforge.git
cd questforge

# Configure o .env de produção
cp .env.example .env
nano .env  # NGINX_PORT=80

cp backend/.env.example backend/.env
nano backend/.env  # APP_ENV=production, APP_DEBUG=false, GEMINI_API_KEY=...

# Execute o deploy
docker-compose build --no-cache
docker-compose up -d

# Inicializar banco
docker-compose exec app php artisan migrate --force
docker-compose exec app php artisan config:cache
```

### Modo Desenvolvimento (Opcional)

Se você quiser desenvolver na VPS com hot reload:

```bash
# Use o docker-compose de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# Acesso:
# Frontend: http://SEU_IP:5173
# Backend: http://SEU_IP:8000
```

> **⚠️ Importante**: O modo dev **não deve ser usado em produção**!

### Script Automatizado

```bash
chmod +x deploy.sh
./deploy.sh
```

> Para atualizações futuras, basta rodar `./deploy.sh` novamente.

---

## 🛡️ Segurança (Produção)

### Arquitetura de Segurança

```
Internet → Firewall → Porta 80 (Nginx)
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
         Frontend (interno)    /api → Backend (interno)
                                     ↓
                            PostgreSQL + Redis (internos)
```

**Princípios Implementados:**

✅ **Gateway Único**: Nginx é o único ponto de entrada (porta 80)  
✅ **Containers Isolados**: Frontend e Backend não são acessíveis diretamente  
✅ **Banco Protegido**: PostgreSQL e Redis apenas na rede interna Docker  
✅ **Build de Produção**: Frontend é servido como arquivos estáticos otimizados  
✅ **Headers de Segurança**: XSS, Clickjacking, MIME-sniffing protections  
✅ **Rate Limiting**: Proteção contra brute-force e spam na API  

### Configuração Obrigatória do Firewall

**IMPORTANTE**: Configure o firewall para permitir apenas portas essenciais:

```bash
# ⚠️ Atenção: Teste SSH antes de ativar o firewall!
sudo ufw allow 22/tcp comment 'SSH'

# Porta pública da aplicação
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS (quando configurar SSL)'

# ❌ NÃO abra portas 5173, 8000, 5432, 6379 - elas devem ser inacessíveis!

# Ativar firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable

# Verificar
sudo ufw status verbose
```

### Checklist de Segurança

- [ ] `APP_DEBUG=false` em produção
- [ ] Senhas fortes no `.env`
- [ ] Firewall configurado (apenas 22, 80, 443)
- [ ] Portas 5173, 8000, 5432, 6379 **não respondem externamente**
- [ ] SSL/HTTPS configurado (Let's Encrypt)
- [ ] Backups automáticos do banco

📚 **Documentação completa**: [docs/SECURITY.md](./docs/SECURITY.md)

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [Funcionalidades](./docs/01-funcionalidades.md) | Módulos e features da plataforma |
| [Arquitetura Técnica](./docs/02-arquitetura.md) | Stack, diagramas e fluxos |
| [Modelagem de Dados](./docs/03-modelagem-dados.md) | Schema do banco e relacionamentos |
| [Engenharia de Prompts](./docs/04-engenharia-prompts.md) | Prompts para a API Gemini |
| [Planejamento](./docs/05-planejamento.md) | Roadmap por fases |
| [API Reference](./docs/06-api-reference.md) | Endpoints REST e contratos |
| [**Guia de Segurança**](./docs/SECURITY.md) | **Firewall, portas, deploy seguro** |

---

## 📄 Licença

MIT — veja [LICENSE](./LICENSE) para mais detalhes.
