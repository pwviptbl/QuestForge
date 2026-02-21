<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SRS Card — Sistema de Revisão Espaçada.
 * Rastreia o progresso de revisão de cada questão por usuário.
 * A migration correspondente é criada na Fase 5.
 */
class SrsCard extends Model
{
    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'questao_id',
        'topico_id',
        'intervalo_atual_dias',
        'repeticoes',
        'fator_facilidade',
        'proxima_revisao',
        'ultima_revisao',
        'status',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'proxima_revisao' => 'datetime',
            'ultima_revisao' => 'datetime',
            'repeticoes' => 'integer',
            'intervalo_atual_dias' => 'integer',
            'fator_facilidade' => 'float',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** O card pertence a um usuário */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** O card refere-se a uma questão */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class);
    }

    /** O card está associado a um tópico */
    public function topico(): BelongsTo
    {
        return $this->belongsTo(Topico::class);
    }
}
