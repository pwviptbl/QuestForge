<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de alternativas (A-E) das questões de múltipla escolha.
     */
    public function up(): void
    {
        Schema::create('alternativas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('questao_id')->constrained('questoes')->cascadeOnDelete();

            $table->char('letra', 1);   // A, B, C, D, E
            $table->text('texto');
            $table->boolean('is_correta')->default(false);

            // Garante que uma questão não tenha duas alternativas com a mesma letra
            $table->unique(['questao_id', 'letra']);
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('alternativas');
    }
};
