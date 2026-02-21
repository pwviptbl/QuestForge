<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de tópicos.
     */
    public function up(): void
    {
        Schema::create('topicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('materia_id')->constrained()->cascadeOnDelete();

            $table->string('nome', 100);
            $table->integer('ordem')->default(0); // ordem de exibição

            $table->timestamps();

            // Garante que não haja tópico duplicado dentro da mesma matéria
            $table->unique(['materia_id', 'nome']);
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('topicos');
    }
};
