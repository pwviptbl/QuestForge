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

| Serviço       | URL / Host              |
|---------------|------------------------|
| **API Laravel** | http://localhost:8000  |
| **PostgreSQL**  | localhost:5432         |
| **Redis**       | localhost:6379         |

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

| Container            | Imagem                 | Porta exposta |
|----------------------|------------------------|---------------|
| `questforge_app`     | PHP 8.4-FPM (custom)   | —             |
| `questforge_nginx`   | nginx:1.27-alpine      | 8000          |
| `questforge_db`      | postgres:16-alpine     | 5432          |
| `questforge_redis`   | redis:7-alpine         | 6379          |

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

```bash
# Clone o repositório na VPS
git clone https://github.com/seu-usuario/questforge.git
cd questforge

# Configure o .env de produção
cp backend/.env.example backend/.env
nano backend/.env  # Ajuste: APP_ENV=production, APP_DEBUG=false, GEMINI_API_KEY=...

# Execute o script de deploy
chmod +x deploy.sh
./deploy.sh
```

> Para atualizações futuras, basta rodar `./deploy.sh` novamente.

---

## 🛡️ Segurança (Produção)

Para garantir que a aplicação rode com segurança em sua VPS, certas medidas a nível de infraestrutura e aplicação já estão configuradas:

**1. Blindagem de Banco de Dados**
As portas do PostgreSQL (`5432`) e Redis (`6379`) agora estão vinculadas estritamente ao `127.0.0.1` dentro do arquivo `docker-compose.yml`. Isso significa que o Docker **não irá ignorar o firewall** para expôr essas portas à rede externa. Elas ficarão invisíveis à internet mundial.

**2. Cabeçalhos e Rate Limiting (API)**
- A API conta ativamente com um **Middleware de Security Headers** que bloqueia tentativas de ataques XSS, Clickjacking (X-Frame-Options) e sniffing de mimetype (nosniff).
- O backend possui **Rate Limiter (Throttle)** pré-configurado limitando a rota de login/registro (`auth/login`) para mitigar brute-force (max 5/min) e a rota de IA (`questoes/gerar`) blindando contra estouro de limites na API Gemini (max 15/min).

**3. Configuração do Firewall (Obrigatória da VPS)**
Mesmo com o sistema seguro, é fundamental que o sistema Operacional (Ubuntu/Debian) bloqueie portas por padrão. Use o UFW:

```bash
# Permita o SSH (Garante que você não perca acesso ao seu servidor)
sudo ufw allow 22/tcp

# Portas essenciais p/ Aplicação
sudo ufw allow 80/tcp     # HTTP 
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 8000/tcp   # Backend API Laravel
sudo ufw allow 5173/tcp   # Frontend Vite (se não estiver com nginx proxyando tudo)

# Travar o resto e ativar o firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

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

---

## 📄 Licença

MIT — veja [LICENSE](./LICENSE) para mais detalhes.
