<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserResponse extends Model
{
    /**
     * Respostas não têm updated_at (imutáveis).
     */
    const UPDATED_AT = null;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'questao_id',
        'resposta_usuario',
        'acertou',
        'solicitou_explicacao',
        'tempo_resposta_seg',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'acertou' => 'boolean',
            'solicitou_explicacao' => 'boolean',
            'tempo_resposta_seg' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** A resposta pertence a um usuário */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** A resposta refere-se a uma questão */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class);
    }
}
