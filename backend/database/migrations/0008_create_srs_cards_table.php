<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de SRS cards (Revisão Espaçada).
     * Algoritmo SM-2 simplificado: intervalos crescentes.
     */
    public function up(): void
    {
        Schema::create('srs_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('questao_id')->constrained('questoes')->cascadeOnDelete();
            $table->foreignId('topico_id')->constrained()->cascadeOnDelete();

            // Controle do algoritmo SM-2
            $table->unsignedTinyInteger('repeticoes')->default(0);       // quantas vezes revisou e acertou em sequência
            $table->unsignedSmallInteger('intervalo_atual_dias')->default(1); // intervalo em dias até a próxima revisão
            $table->float('fator_facilidade')->default(2.5);             // E-Factor do SM-2

            // Timestamps de controle
            $table->timestamp('ultima_revisao')->nullable();
            $table->timestamp('proxima_revisao')->useCurrent();
            $table->enum('status', ['pendente', 'dominado'])->default('pendente');

            $table->timestamps();

            // Uma questão → um card por usuário
            $table->unique(['user_id', 'questao_id']);

            // Índice para busca de pendentes por data
            $table->index(['user_id', 'status', 'proxima_revisao']);
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('srs_cards');
    }
};
