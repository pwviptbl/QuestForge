<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alternativa extends Model
{
    /**
     * Alternativas não têm timestamps (são imutáveis após criação).
     */
    public $timestamps = false;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'questao_id',
        'letra',
        'texto',
        'is_correta',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_correta' => 'boolean',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** A alternativa pertence a uma questão */
    public function questao(): BelongsTo
    {
        return $this->belongsTo(Questao::class);
    }
}
