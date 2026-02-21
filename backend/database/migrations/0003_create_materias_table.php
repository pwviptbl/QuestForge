<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de matérias.
     */
    public function up(): void
    {
        Schema::create('materias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('concurso_id')->constrained()->cascadeOnDelete();

            $table->string('nome', 100);
            $table->integer('ordem')->default(0); // ordem de exibição

            $table->timestamps();

            // Garante que não haja matéria duplicada dentro do mesmo concurso
            $table->unique(['concurso_id', 'nome']);
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('materias');
    }
};
