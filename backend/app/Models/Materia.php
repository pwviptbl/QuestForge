<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Materia extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'concurso_id',
        'nome',
        'ordem',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ordem' => 'integer',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** A matéria pertence a um concurso */
    public function concurso(): BelongsTo
    {
        return $this->belongsTo(Concurso::class);
    }

    /** Uma matéria possui muitos tópicos */
    public function topicos(): HasMany
    {
        return $this->hasMany(Topico::class)->orderBy('ordem');
    }
}
