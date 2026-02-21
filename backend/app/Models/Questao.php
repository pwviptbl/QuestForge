<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Questao extends Model
{
    use HasFactory;

    protected $table = 'questoes';

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'topico_id',
        'enunciado',
        'tipo',
        'dificuldade',
        'resposta_correta',
        'explicacao',
        'gemini_prompt_hash',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** A questão pertence a um tópico */
    public function topico(): BelongsTo
    {
        return $this->belongsTo(Topico::class);
    }

    /** Uma questão possui alternativas (múltipla escolha) */
    public function alternativas(): HasMany
    {
        return $this->hasMany(Alternativa::class)->orderBy('letra');
    }

    /** Uma questão possui muitas respostas de usuários */
    public function responses(): HasMany
    {
        return $this->hasMany(UserResponse::class);
    }

    /** Uma questão pode ter um SRS card associado */
    public function srsCard(): HasOne
    {
        return $this->hasOne(SrsCard::class);
    }
}
