<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Cria a tabela de respostas dos usuários às questões.
     */
    public function up(): void
    {
        Schema::create('user_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('questao_id')->constrained('questoes')->cascadeOnDelete();

            $table->string('resposta_usuario', 10); // A-E | CERTO | ERRADO
            $table->boolean('acertou');
            $table->boolean('solicitou_explicacao')->default(false);
            $table->integer('tempo_resposta_seg')->nullable(); // tempo para responder

            // Sem updated_at pois respostas são imutáveis
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('questao_id');
            $table->index(['user_id', 'created_at']); // consultas de histórico por data
        });
    }

    /**
     * Reverte a criação da tabela.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_responses');
    }
};
