# 🏗️ Arquitetura Técnica — QuestForge

## Visão Geral da Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | React 18 (Vite) | Componentização, estado reativo, ecossistema rico, build rápido com Vite |
| **Backend** | PHP 8.2+ (Laravel 11) | Framework robusto, Eloquent ORM, Artisan CLI, ecossistema maduro |
| **Banco de Dados** | SQLite (dev) → PostgreSQL/MySQL (prod) | Eloquent ORM permite troca transparente |
| **IA** | Google Gemini API | Geração de questões e explicações sob demanda |
| **Autenticação** | Laravel Sanctum (JWT/Token) | Integrado ao Laravel, SPA-friendly, stateless |
| **Task Queue** | Laravel Queue + Scheduler | Jobs assíncronos e agendamento de revisões SRS |
| **Cache** | Laravel Cache (file/redis) | Cache de questões geradas e sessões |

---

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────┐
│                 FRONTEND (React + Vite)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Auth    │ │  Edital  │ │  Quiz    │ │ Dash-  │ │
│  │  Pages   │ │  Pages   │ │  Pages   │ │ board  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │            │            │            │      │
│       └────────────┴─────┬──────┴────────────┘      │
│                     Axios │ HTTP/JSON                │
└──────────────────────────┼──────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                   BACKEND (Laravel 11)               │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ Auth      │ │ Concurso  │ │ Questao          │   │
│  │Controller │ │Controller │ │ Controller       │   │
│  └─────┬─────┘ └─────┬─────┘ └────────┬─────────┘   │
│        │              │               │              │
│  ┌─────▼─────────────▼───────────────▼──────────┐   │
│  │              Service Layer                    │   │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────┐  │   │
│  │  │ Auth     │ │ Syllabus   │ │ Gemini     │  │   │
│  │  │ Service  │ │ Service    │ │ Service    │  │   │
│  │  └──────────┘ └────────────┘ └─────┬──────┘  │   │
│  └────────────────────────────────────┼─────────┘   │
│                                       │              │
│  ┌────────────────────────┐    ┌──────▼──────┐      │
│  │   Eloquent ORM         │    │ Gemini API  │      │
│  │   (Models + Relations) │    │ Client      │      │
│  └───────────┬────────────┘    └─────────────┘      │
└──────────────┼───────────────────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │  MySQL /       │
       │  PostgreSQL /  │
       │  SQLite        │
       └───────────────┘
```

---

## Estrutura de Diretórios (Laravel)

```
QuestForge/
├── docs/                              # Documentação do projeto
│
├── backend/                           # Projeto Laravel
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── ConcursoController.php
│   │   │   │   ├── QuestaoController.php
│   │   │   │   ├── DashboardController.php
│   │   │   │   └── PomodoroController.php
│   │   │   ├── Middleware/
│   │   │   │   └── EnsureTokenIsValid.php
│   │   │   └── Requests/
│   │   │       ├── RegisterRequest.php
│   │   │       ├── LoginRequest.php
│   │   │       ├── ConcursoRequest.php
│   │   │       └── GerarQuestoesRequest.php
│   │   │
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Concurso.php
│   │   │   ├── Materia.php
│   │   │   ├── Topico.php
│   │   │   ├── Questao.php
│   │   │   ├── Alternativa.php
│   │   │   ├── UserResponse.php
│   │   │   ├── SrsCard.php
│   │   │   └── PomodoroSession.php
│   │   │
│   │   └── Services/
│   │       ├── SyllabusParserService.php
│   │       ├── GeminiService.php
│   │       ├── SrsService.php
│   │       └── DashboardService.php
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 0001_create_users_table.php
│   │   │   ├── 0002_create_concursos_table.php
│   │   │   ├── 0003_create_materias_table.php
│   │   │   ├── 0004_create_topicos_table.php
│   │   │   ├── 0005_create_questoes_table.php
│   │   │   ├── 0006_create_alternativas_table.php
│   │   │   ├── 0007_create_user_responses_table.php
│   │   │   ├── 0008_create_srs_cards_table.php
│   │   │   └── 0009_create_pomodoro_sessions_table.php
│   │   └── seeders/
│   │
│   ├── routes/
│   │   └── api.php                    # Todas as rotas da API
│   │
│   ├── config/
│   │   └── gemini.php                 # Config da API Gemini
│   │
│   ├── .env.example
│   ├── composer.json
│   └── artisan
│
├── frontend/                          # Projeto React (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.jsx                   # Entrypoint React
│       ├── App.jsx                    # Router principal
│       ├── index.css                  # Estilos globais + design tokens
│       │
│       ├── api/
│       │   └── client.js              # Axios instance com interceptors
│       │
│       ├── contexts/
│       │   └── AuthContext.jsx        # Context de autenticação
│       │
│       ├── hooks/
│       │   ├── useAuth.js             # Hook de autenticação
│       │   ├── usePomodoro.js         # Hook do timer Pomodoro
│       │   └── useSrs.js              # Hook de revisão espaçada
│       │
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Home.jsx               # Lista de concursos
│       │   ├── EditalForm.jsx         # Cadastro de edital
│       │   ├── ConcursoDetail.jsx     # Matérias e tópicos
│       │   ├── QuizConfig.jsx         # Configuração da bateria
│       │   ├── QuizPlay.jsx           # Quiz interativo
│       │   └── Dashboard.jsx          # Dashboard de vulnerabilidades
│       │
│       ├── components/
│       │   ├── Layout.jsx             # Layout geral com navbar
│       │   ├── ProtectedRoute.jsx     # Rota protegida
│       │   ├── Toast.jsx              # Notificações
│       │   ├── Modal.jsx              # Modal dialog
│       │   ├── Spinner.jsx            # Loading spinner
│       │   ├── PomodoroTimer.jsx      # Timer Pomodoro
│       │   └── QuestionCard.jsx       # Card de questão
│       │
│       └── utils/
│           └── helpers.js             # Funções utilitárias
│
└── .gitignore
```

---

## Fluxos Principais

### Fluxo 1: Cadastro de Edital
```
Usuário digita sintaxe → Frontend valida formato →
POST /api/concursos (body: {nome, sintaxe}) →
ConcursoController → SyllabusParserService::parse() →
Cria Concurso + Matérias + Tópicos (Eloquent) →
Retorna JSON com estrutura → Frontend renderiza árvore
```

### Fluxo 2: Geração de Questões
```
Usuário configura bateria (qtd, escopo, dificuldade) →
POST /api/questoes/gerar →
QuestaoController → GeminiService::gerarQuestoes() →
Monta prompt → Gemini API → Parse JSON → Salva no DB (Eloquent) →
Retorna questões ao Frontend → Renderiza quiz interativo
```

### Fluxo 3: Resposta + Explicação
```
Usuário responde questão → POST /api/respostas →
QuestaoController → Valida, registra acerto/erro →
Retorna feedback (correto/incorreto) →
[Opcional] Clica "Gerar Explicação" →
POST /api/questoes/{id}/explicacao →
GeminiService::gerarExplicacao() → Retorna texto →
SrsService::criarCard() → Frontend exibe explicação
```

### Fluxo 4: Revisão Espaçada (SRS)
```
Laravel Scheduler (diário) → SrsService::verificarPendentes() →
Ao iniciar bateria, sistema injeta questões SRS pendentes →
Usuário responde → Acertou? Próximo intervalo (3d→7d→14d→30d) :
                    Errou? Reset para 1 dia
```

---

## Configuração de Ambiente (`.env`)

```env
# ─── App ──────────────────────────────────────────────
APP_NAME=QuestForge
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

# ─── Banco de Dados ──────────────────────────────────
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/questforge.db
# Para MySQL/PostgreSQL em produção:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=questforge
# DB_USERNAME=root
# DB_PASSWORD=

# ─── Sanctum ─────────────────────────────────────────
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:5500

# ─── Gemini API ──────────────────────────────────────
GEMINI_API_KEY=sua-api-key-aqui
GEMINI_MODEL=gemini-2.0-flash

# ─── CORS ─────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500

# ─── Queue (para SRS Scheduler) ──────────────────────
QUEUE_CONNECTION=database
```
