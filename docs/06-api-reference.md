# 📡 API Reference — QuestForge

## Base URL
```
http://localhost:8000/api
```

## Autenticação
Todos os endpoints (exceto registro e login) requerem header:
```
Authorization: Bearer <sanctum_token>
```

---

## 1. Autenticação (`/api/auth`)

### `POST /api/auth/register`
Cria uma nova conta de usuário.

**Request Body:**
```json
{
  "nome": "Marcio Silva",
  "email": "marcio@email.com",
  "senha": "MinhaSenh@Segura123"
}
```

**Response `201 Created`:**
```json
{
  "id": 1,
  "nome": "Marcio Silva",
  "email": "marcio@email.com",
  "nivel": "Iniciante",
  "created_at": "2026-02-20T00:00:00Z"
}
```

**Erros:**
| Código | Descrição |
|--------|-----------|
| 400 | E-mail já cadastrado |
| 422 | Campos obrigatórios ausentes ou senha fraca |

---

### `POST /api/auth/login`
Autentica o usuário e retorna token Sanctum.

**Request Body:**
```json
{
  "email": "marcio@email.com",
  "senha": "MinhaSenh@Segura123"
}
```

**Response `200 OK`:**
```json
{
  "access_token": "1|abc123def456...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "nome": "Marcio Silva",
    "email": "marcio@email.com"
  }
}
```

---

### `GET /api/auth/me`
Retorna dados do usuário autenticado. 🔒

**Response `200 OK`:**
```json
{
  "id": 1,
  "nome": "Marcio Silva",
  "email": "marcio@email.com",
  "nivel": "Intermediario",
  "pomodoro_duracao": 25,
  "meta_diaria_questoes": 20,
  "created_at": "2026-02-20T00:00:00Z"
}
```

---

## 2. Concursos (`/api/concursos`)

### `POST /api/concursos`
Cria um concurso com parse automático do edital. 🔒

**Request Body:**
```json
{
  "nome": "Concurso INSS 2026",
  "descricao": "Técnico do Seguro Social",
  "data_prova": "2026-06-15",
  "sintaxe": "Portugues-interpretação,pontuação,concordância;Matematica-soma,divisão,porcentagem;Informatica-redes,segurança"
}
```

**Response `201 Created`:**
```json
{
  "id": 1,
  "nome": "Concurso INSS 2026",
  "descricao": "Técnico do Seguro Social",
  "data_prova": "2026-06-15",
  "materias": [
    {
      "id": 1,
      "nome": "Portugues",
      "topicos": [
        {"id": 1, "nome": "interpretação"},
        {"id": 2, "nome": "pontuação"},
        {"id": 3, "nome": "concordância"}
      ]
    },
    {
      "id": 2,
      "nome": "Matematica",
      "topicos": [
        {"id": 4, "nome": "soma"},
        {"id": 5, "nome": "divisão"},
        {"id": 6, "nome": "porcentagem"}
      ]
    },
    {
      "id": 3,
      "nome": "Informatica",
      "topicos": [
        {"id": 7, "nome": "redes"},
        {"id": 8, "nome": "segurança"}
      ]
    }
  ],
  "created_at": "2026-02-20T00:00:00Z"
}
```

---

### `GET /api/concursos`
Lista todos os concursos do usuário. 🔒

**Response `200 OK`:**
```json
{
  "concursos": [
    {
      "id": 1,
      "nome": "Concurso INSS 2026",
      "data_prova": "2026-06-15",
      "total_materias": 3,
      "total_topicos": 8,
      "created_at": "2026-02-20T00:00:00Z"
    }
  ]
}
```

---

### `GET /api/concursos/{id}`
Retorna detalhes do concurso com matérias e tópicos. 🔒

---

### `DELETE /api/concursos/{id}`
Exclui concurso e todos os dados relacionados (cascade). 🔒

**Response `204 No Content`**

---

## 3. Questões (`/api/questoes`)

### `POST /api/questoes/gerar`
Gera uma bateria de questões via Gemini API. 🔒

**Request Body:**
```json
{
  "concurso_id": 1,
  "quantidade": 10,
  "tipo": "multipla_escolha",
  "dificuldade": "adaptativa",
  "escopo": {
    "modo": "topico_especifico",
    "topico_id": 2
  }
}
```

**Modos de escopo disponíveis:**
| Modo | Campos necessários |
|------|-------------------|
| `simulado_mesclado` | `concurso_id` |
| `materia_especifica` | `materia_id` |
| `topico_especifico` | `topico_id` |
| `revisao_srs` | nenhum (busca automática) |

**Response `201 Created`:**
```json
{
  "bateria_id": "uuid-da-bateria",
  "questoes": [
    {
      "id": 101,
      "enunciado": "Qual é o resultado de 15 + 27?",
      "tipo": "multipla_escolha",
      "dificuldade": "facil",
      "topico": "soma",
      "materia": "Matematica",
      "alternativas": [
        {"letra": "A", "texto": "32"},
        {"letra": "B", "texto": "42"},
        {"letra": "C", "texto": "52"},
        {"letra": "D", "texto": "38"},
        {"letra": "E", "texto": "45"}
      ]
    }
  ],
  "total": 10
}
```

---

### `POST /api/respostas`
Registra a resposta do usuário a uma questão. 🔒

**Request Body:**
```json
{
  "questao_id": 101,
  "resposta": "B",
  "tempo_resposta_seg": 23
}
```

**Response `200 OK`:**
```json
{
  "acertou": true,
  "resposta_correta": "B",
  "explicacao": null
}
```

---

### `POST /api/questoes/{id}/explicacao`
Gera explicação on-demand para uma questão. 🔒

**Response `200 OK`:**
```json
{
  "explicacao": "A soma de 15 + 27 envolve a adição simples...",
  "srs_criado": true
}
```

---

## 4. SRS — Revisão Espaçada (`/api/srs`)

### `GET /api/srs/pendentes`
Lista questões pendentes de revisão. 🔒

**Response `200 OK`:**
```json
{
  "total_pendentes": 5,
  "por_materia": {
    "Portugues": 3,
    "Matematica": 2
  },
  "cards": [
    {
      "id": 1,
      "questao_id": 101,
      "topico": "pontuação",
      "materia": "Portugues",
      "intervalo_atual_dias": 1,
      "repeticoes": 0,
      "proxima_revisao": "2026-02-21T00:00:00Z"
    }
  ]
}
```

---

## 5. Dashboard (`/api/dashboard`)

### `GET /api/dashboard/stats`
Retorna estatísticas gerais do usuário. 🔒

**Response `200 OK`:**
```json
{
  "total_questoes_respondidas": 150,
  "taxa_acerto_geral": 68.5,
  "questoes_hoje": 12,
  "meta_diaria": 20,
  "pomodoros_hoje": 3,
  "sequencia_dias": 7,
  "srs_pendentes": 5
}
```

---

### `GET /api/dashboard/vulnerabilities`
Retorna taxas de erro por tópico, ordenadas da pior para a melhor. 🔒

**Query Parameters:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| concurso_id | int | obrigatório | Filtrar por concurso |
| limit | int | 10 | Quantidade de tópicos |

**Response `200 OK`:**
```json
{
  "vulnerabilidades": [
    {
      "topico_id": 2,
      "topico": "pontuação",
      "materia": "Portugues",
      "total_respondidas": 20,
      "total_erradas": 14,
      "taxa_erro": 70.0,
      "severidade": "alta"
    },
    {
      "topico_id": 5,
      "topico": "divisão",
      "materia": "Matematica",
      "total_respondidas": 15,
      "total_erradas": 6,
      "taxa_erro": 40.0,
      "severidade": "media"
    }
  ],
  "alerta": "Foque em **pontuação** hoje — taxa de erro: 70%"
}
```

---

## 6. Pomodoro (`/api/pomodoro`)

### `POST /api/pomodoro/iniciar`
Inicia uma sessão Pomodoro. 🔒

**Request Body:**
```json
{
  "concurso_id": 1,
  "duracao_minutos": 25
}
```

**Response `201 Created`:**
```json
{
  "session_id": 1,
  "duracao_minutos": 25,
  "iniciado_em": "2026-02-20T10:00:00Z",
  "status": "ativo"
}
```

---

### `PUT /api/pomodoro/{id}/finalizar`
Finaliza uma sessão Pomodoro. 🔒

**Request Body:**
```json
{
  "questoes_respondidas": 8,
  "questoes_acertadas": 6,
  "status": "completo"
}
```

---

## Códigos de Erro Padrão

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request — dados inválidos |
| 401 | Unauthorized — token ausente ou inválido |
| 403 | Forbidden — sem permissão para o recurso |
| 404 | Not Found — recurso não encontrado |
| 422 | Unprocessable Entity — validação falhou |
| 429 | Too Many Requests — rate limit excedido |
| 500 | Internal Server Error — erro inesperado |

**Formato de erro padrão:**
```json
{
  "detail": "Mensagem descritiva do erro",
  "error_code": "VALIDATION_ERROR",
  "field": "email"
}
```
