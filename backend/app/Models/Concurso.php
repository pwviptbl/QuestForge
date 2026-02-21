<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Concurso extends Model
{
    use HasFactory;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'nome',
        'descricao',
        'data_prova',
        'sintaxe_original',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data_prova' => 'date',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** O concurso pertence a um usuário */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Um concurso possui muitas matérias */
    public function materias(): HasMany
    {
        return $this->hasMany(Materia::class)->orderBy('ordem');
    }

    /** Acesso direto a todos os tópicos do concurso (via matérias) */
    public function topicos(): HasManyThrough
    {
        return $this->hasManyThrough(Topico::class, Materia::class);
    }
}
