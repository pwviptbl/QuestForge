# 🗄️ Modelagem de Dados — QuestForge

## Diagrama Entidade-Relacionamento (ER)

```mermaid
erDiagram
    USER ||--o{ CONCURSO : cadastra
    USER ||--o{ USER_RESPONSE : responde
    USER ||--o{ SRS_CARD : possui
    USER ||--o{ POMODORO_SESSION : realiza

    CONCURSO ||--|{ MATERIA : contem
    MATERIA ||--|{ TOPICO : contem

    TOPICO ||--o{ QUESTAO : pertence
    QUESTAO ||--|{ ALTERNATIVA : possui
    QUESTAO ||--o{ USER_RESPONSE : recebe
    QUESTAO ||--o| SRS_CARD : gera

    USER {
        bigint id PK
        string nome
        string email UK
        string password
        string nivel "Iniciante/Intermediario/Avancado"
        int pomodoro_duracao "default 25"
        int meta_diaria_questoes "default 20"
        timestamp created_at
        timestamp updated_at
    }

    CONCURSO {
        bigint id PK
        bigint user_id FK
        string nome
        text descricao
        date data_prova
        text sintaxe_original
        timestamp created_at
        timestamp updated_at
    }

    MATERIA {
        bigint id PK
        bigint concurso_id FK
        string nome
        int ordem
        timestamp created_at
        timestamp updated_at
    }

    TOPICO {
        bigint id PK
        bigint materia_id FK
        string nome
        int ordem
        timestamp created_at
        timestamp updated_at
    }

    QUESTAO {
        bigint id PK
        bigint topico_id FK
        text enunciado
        string tipo "multipla_escolha/certo_errado"
        string dificuldade "facil/medio/dificil"
        string resposta_correta
        text explicacao "nullable"
        string gemini_prompt_hash "nullable"
        timestamp created_at
        timestamp updated_at
    }

    ALTERNATIVA {
        bigint id PK
        bigint questao_id FK
        string letra "A/B/C/D/E"
        text texto
        boolean is_correta
    }

    USER_RESPONSE {
        bigint id PK
        bigint user_id FK
        bigint questao_id FK
        string resposta_usuario
        boolean acertou
        boolean solicitou_explicacao
        int tempo_resposta_seg
        timestamp created_at
    }

    SRS_CARD {
        bigint id PK
        bigint user_id FK
        bigint questao_id FK
        bigint topico_id FK
        int intervalo_atual_dias "1, 3, 7, 14, 30"
        int repeticoes "revisoes corretas"
        float fator_facilidade "default 2.5"
        timestamp proxima_revisao
        timestamp ultima_revisao
        string status "pendente/dominado/suspenso"
        timestamp created_at
        timestamp updated_at
    }

    POMODORO_SESSION {
        bigint id PK
        bigint user_id FK
        bigint concurso_id FK
        int duracao_minutos
        int questoes_respondidas
        int questoes_acertadas
        timestamp iniciado_em
        timestamp finalizado_em
        string status "ativo/completo/interrompido"
        timestamp created_at
        timestamp updated_at
    }
```

---

## Migrations Laravel

### `users` (já vem com Laravel, adicionar campos extras)
```php
// Campos extras no User
$table->string('nivel')->default('Iniciante');
$table->integer('pomodoro_duracao')->default(25);
$table->integer('meta_diaria_questoes')->default(20);
```

### `concursos`
```php
Schema::create('concursos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('nome', 200);
    $table->text('descricao')->nullable();
    $table->date('data_prova')->nullable();
    $table->text('sintaxe_original');
    $table->timestamps();
});
```

### `materias`
```php
Schema::create('materias', function (Blueprint $table) {
    $table->id();
    $table->foreignId('concurso_id')->constrained()->cascadeOnDelete();
    $table->string('nome', 100);
    $table->integer('ordem')->default(0);
    $table->timestamps();

    $table->unique(['concurso_id', 'nome']);
});
```

### `topicos`
```php
Schema::create('topicos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('materia_id')->constrained()->cascadeOnDelete();
    $table->string('nome', 100);
    $table->integer('ordem')->default(0);
    $table->timestamps();

    $table->unique(['materia_id', 'nome']);
});
```

### `questoes`
```php
Schema::create('questoes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('topico_id')->constrained()->cascadeOnDelete();
    $table->text('enunciado');
    $table->string('tipo', 20);           // multipla_escolha ou certo_errado
    $table->string('dificuldade', 10);    // facil, medio, dificil
    $table->string('resposta_correta', 5);
    $table->text('explicacao')->nullable();
    $table->string('gemini_prompt_hash', 64)->nullable();
    $table->timestamps();

    $table->index('topico_id');
});
```

### `alternativas`
```php
Schema::create('alternativas', function (Blueprint $table) {
    $table->id();
    $table->foreignId('questao_id')->constrained()->cascadeOnDelete();
    $table->char('letra', 1);             // A, B, C, D, E
    $table->text('texto');
    $table->boolean('is_correta')->default(false);
});
```

### `user_responses`
```php
Schema::create('user_responses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('questao_id')->constrained()->cascadeOnDelete();
    $table->string('resposta_usuario', 5);
    $table->boolean('acertou');
    $table->boolean('solicitou_explicacao')->default(false);
    $table->integer('tempo_resposta_seg')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->index('user_id');
    $table->index('questao_id');
});
```

### `srs_cards`
```php
Schema::create('srs_cards', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('questao_id')->constrained()->cascadeOnDelete();
    $table->foreignId('topico_id')->constrained()->cascadeOnDelete();
    $table->integer('intervalo_atual_dias')->default(1);
    $table->integer('repeticoes')->default(0);
    $table->float('fator_facilidade')->default(2.5);
    $table->timestamp('proxima_revisao');
    $table->timestamp('ultima_revisao')->nullable();
    $table->string('status', 20)->default('pendente');
    $table->timestamps();

    $table->unique(['user_id', 'questao_id']);
    $table->index(['user_id', 'proxima_revisao']);
    $table->index(['user_id', 'status']);
});
```

### `pomodoro_sessions`
```php
Schema::create('pomodoro_sessions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('concurso_id')->nullable()->constrained()->nullOnDelete();
    $table->integer('duracao_minutos');
    $table->integer('questoes_respondidas')->default(0);
    $table->integer('questoes_acertadas')->default(0);
    $table->timestamp('iniciado_em');
    $table->timestamp('finalizado_em')->nullable();
    $table->string('status', 20)->default('ativo');
    $table->timestamps();

    $table->index('user_id');
});
```

---

## Relacionamentos Eloquent

```php
// User.php
public function concursos() { return $this->hasMany(Concurso::class); }
public function responses() { return $this->hasMany(UserResponse::class); }
public function srsCards() { return $this->hasMany(SrsCard::class); }
public function pomodoroSessions() { return $this->hasMany(PomodoroSession::class); }

// Concurso.php
public function user() { return $this->belongsTo(User::class); }
public function materias() { return $this->hasMany(Materia::class); }

// Materia.php
public function concurso() { return $this->belongsTo(Concurso::class); }
public function topicos() { return $this->hasMany(Topico::class); }

// Topico.php
public function materia() { return $this->belongsTo(Materia::class); }
public function questoes() { return $this->hasMany(Questao::class); }

// Questao.php
public function topico() { return $this->belongsTo(Topico::class); }
public function alternativas() { return $this->hasMany(Alternativa::class); }
public function responses() { return $this->hasMany(UserResponse::class); }
public function srsCard() { return $this->hasOne(SrsCard::class); }
```
