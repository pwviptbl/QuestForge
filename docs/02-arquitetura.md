# 🏗️ Arquitetura Técnica — QuestForge

## Visão Geral da Stack

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | HTML + CSS + JavaScript (Vanilla) | Simplicidade, controle total, sem overhead de framework |
| **Backend** | Python (FastAPI) | Performance async, typing nativo, excelente para APIs REST |
| **Banco de Dados** | SQLite (dev) → PostgreSQL (prod) | SQLAlchemy como ORM permite troca transparente |
| **IA** | Google Gemini API | Geração de questões e explicações sob demanda |
| **Autenticação** | JWT (PyJWT) | Stateless, escalável, padrão de mercado |
| **Task Queue** | APScheduler / Celery (futuro) | Agendamento de revisões SRS |

---

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  Login/  │ │  Edital  │ │  Quiz    │ │ Dash-  │ │
│  │ Cadastro │ │  Parser  │ │  Engine  │ │ board  │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ │
│       │            │            │            │      │
│       └────────────┴─────┬──────┴────────────┘      │
│                          │ HTTP/JSON                 │
└──────────────────────────┼──────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                   │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ Auth      │ │ Syllabus  │ │ Assessment       │   │
│  │ Router    │ │ Router    │ │ Router           │   │
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
│  │   SQLAlchemy ORM       │    │ Gemini API  │      │
│  │   (Models + Repos)     │    │ Client      │      │
│  └───────────┬────────────┘    └─────────────┘      │
└──────────────┼───────────────────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │  PostgreSQL /  │
       │  SQLite        │
       └───────────────┘
```

---

## Estrutura de Diretórios

```
QuestForge/
├── docs/                          # Documentação do projeto
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # Entrypoint FastAPI
│   │   ├── config.py              # Variáveis de ambiente e configurações
│   │   ├── database.py            # Engine SQLAlchemy + SessionLocal
│   │   │
│   │   ├── models/                # Modelos SQLAlchemy (ORM)
│   │   │   ├── __init__.py
│   │   │   ├── user.py            # User
│   │   │   ├── concurso.py        # Concurso, Materia, Topico
│   │   │   ├── questao.py         # Questao, Alternativa
│   │   │   ├── resposta.py        # UserResponse
│   │   │   └── srs.py             # SRSCard (revisão espaçada)
│   │   │
│   │   ├── schemas/               # Pydantic schemas (request/response)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── concurso.py
│   │   │   ├── questao.py
│   │   │   └── dashboard.py
│   │   │
│   │   ├── routers/               # Endpoints da API
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── concurso.py
│   │   │   ├── questao.py
│   │   │   └── dashboard.py
│   │   │
│   │   ├── services/              # Lógica de negócio
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── syllabus_parser.py # Parser do edital
│   │   │   ├── gemini_service.py  # Integração Gemini API
│   │   │   ├── srs_service.py     # Motor de revisão espaçada
│   │   │   └── dashboard_service.py
│   │   │
│   │   └── utils/                 # Utilitários
│   │       ├── __init__.py
│   │       ├── security.py        # Hashing, JWT
│   │       └── prompts.py         # Templates de prompts Gemini
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── alembic/                   # Migrações do banco de dados
│       └── ...
│
├── frontend/
│   ├── index.html                 # Página principal (SPA)
│   ├── css/
│   │   ├── variables.css          # Design tokens (cores, fontes, espaçamentos)
│   │   ├── base.css               # Reset e estilos globais
│   │   ├── components.css         # Componentes reutilizáveis
│   │   └── pages.css              # Estilos específicos de páginas
│   ├── js/
│   │   ├── app.js                 # Router SPA e inicialização
│   │   ├── api.js                 # Cliente HTTP (fetch wrapper com JWT)
│   │   ├── auth.js                # Lógica de login/cadastro
│   │   ├── edital.js              # Gestão de editais
│   │   ├── quiz.js                # Motor de quiz
│   │   ├── pomodoro.js            # Timer Pomodoro
│   │   ├── dashboard.js           # Dashboard e gráficos
│   │   └── utils.js               # Helpers
│   └── assets/
│       └── icons/
│
└── .gitignore
```

---

## Fluxos Principais

### Fluxo 1: Cadastro de Edital
```
Usuário digita sintaxe → Frontend valida formato →
POST /api/concursos (body: {nome, sintaxe}) →
Backend: syllabus_parser.parse() → Cria Concurso + Matérias + Tópicos →
Retorna estrutura completa em JSON → Frontend renderiza árvore
```

### Fluxo 2: Geração de Questões
```
Usuário configura bateria (qtd, escopo, dificuldade) →
POST /api/questoes/gerar →
Backend: monta prompt estruturado → Gemini API → Parse JSON response →
Salva questões no DB → Retorna questões ao Frontend →
Frontend renderiza quiz interativo
```

### Fluxo 3: Resposta + Explicação
```
Usuário responde questão → POST /api/respostas →
Backend: valida, registra acerto/erro, atualiza perfil →
Retorna feedback (correto/incorreto) →
[Opcional] Usuário clica "Gerar Explicação" →
POST /api/questoes/{id}/explicacao →
Backend: monta prompt de explicação → Gemini API → Retorna texto →
Backend: cria SRSCard para revisão → Frontend exibe explicação
```

### Fluxo 4: Revisão Espaçada (SRS)
```
Scheduler diário verifica SRSCards com next_review_at <= hoje →
Ao iniciar bateria, sistema injeta questões SRS pendentes →
Usuário responde → Acertou? Próximo intervalo (3d→7d→14d→30d) :
                    Errou? Reset para 1 dia
```

---

## Configuração de Ambiente

### Variáveis de Ambiente (`.env`)
```env
# Banco de Dados
DATABASE_URL=sqlite:///./questforge.db

# JWT
JWT_SECRET_KEY=sua-chave-secreta-aqui
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Gemini API
GEMINI_API_KEY=sua-api-key-aqui
GEMINI_MODEL=gemini-2.0-flash

# App
APP_HOST=0.0.0.0
APP_PORT=8000
APP_DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```
