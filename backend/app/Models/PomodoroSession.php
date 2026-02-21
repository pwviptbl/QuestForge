<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PomodoroSession extends Model
{
    /**
     * Sessões Pomodoro não têm updated_at (imutáveis após finalização).
     */
    const UPDATED_AT = null;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'concurso_id',
        'duracao_min',
        'blocos_completados',
        'questoes_respondidas',
        'acertos',
        'iniciada_em',
        'finalizada_em',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'iniciada_em' => 'datetime',
            'finalizada_em' => 'datetime',
            'duracao_min' => 'integer',
            'blocos_completados' => 'integer',
            'questoes_respondidas' => 'integer',
            'acertos' => 'integer',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** A sessão pertence a um usuário */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** A sessão pode estar vinculada a um concurso */
    public function concurso(): BelongsTo
    {
        return $this->belongsTo(Concurso::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /** Duração real da sessão em minutos */
    public function duracaoRealMin(): ?int
    {
        if (!$this->finalizada_em)
            return null;
        return (int) $this->iniciada_em->diffInMinutes($this->finalizada_em);
    }

    /** Taxa de acerto da sessão em porcentagem */
    public function taxaAcertoPct(): ?float
    {
        if ($this->questoes_respondidas === 0)
            return null;
        return round(($this->acertos / $this->questoes_respondidas) * 100, 1);
    }
}
