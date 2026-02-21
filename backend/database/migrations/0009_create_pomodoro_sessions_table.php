<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de sessões Pomodoro.
     */
    public function up(): void
    {
        Schema::create('pomodoro_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Referência opcional ao contexto de estudo
            $table->foreignId('concurso_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedTinyInteger('duracao_min');        // duração configurada (25, 30, 45…)
            $table->unsignedTinyInteger('blocos_completados'); // quantos blocos de foco foram concluídos
            $table->unsignedSmallInteger('questoes_respondidas')->default(0); // questões respondidas nessa sessão
            $table->unsignedSmallInteger('acertos')->default(0);

            $table->timestamp('iniciada_em');
            $table->timestamp('finalizada_em')->nullable();

            // Sem updated_at — sessões são imutáveis após finalização
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index(['user_id', 'iniciada_em']); // consultas de histórico
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('pomodoro_sessions');
    }
};
