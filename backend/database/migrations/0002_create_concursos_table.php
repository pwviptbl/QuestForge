<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de concursos.
     */
    public function up(): void
    {
        Schema::create('concursos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('nome', 200);
            $table->text('descricao')->nullable();
            $table->date('data_prova')->nullable();

            // Sintaxe original cadastrada pelo usuário (para edição futura)
            $table->text('sintaxe_original');

            $table->timestamps();

            // Índice para listagens do usuário
            $table->index('user_id');
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('concursos');
    }
};
