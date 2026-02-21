<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de questões geradas pelo Gemini.
     */
    public function up(): void
    {
        Schema::create('questoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topico_id')->constrained()->cascadeOnDelete();

            $table->text('enunciado');
            $table->string('tipo', 20);           // multipla_escolha | certo_errado
            $table->string('dificuldade', 10);    // facil | medio | dificil
            $table->string('resposta_correta', 10); // A-E | CERTO | ERRADO
            $table->text('explicacao')->nullable(); // gerada on-demand pelo Gemini

            // Hash do prompt usado para geração (evitar duplicatas)
            $table->string('gemini_prompt_hash', 64)->nullable()->index();

            $table->timestamps();

            $table->index('topico_id');
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('questoes');
    }
};
