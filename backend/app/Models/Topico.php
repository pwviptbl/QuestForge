<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Topico extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'materia_id',
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

    /** O tópico pertence a uma matéria */
    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    /** Um tópico possui muitas questões geradas */
    public function questoes(): HasMany
    {
        return $this->hasMany(Questao::class);
    }

    /** Um tópico pode ter muitos SRS cards associados */
    public function srsCards(): HasMany
    {
        return $this->hasMany(SrsCard::class);
    }
}
