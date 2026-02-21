<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Atributos que podem ser preenchidos via mass-assignment.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'nivel',
        'pomodoro_duracao',
        'meta_diaria_questoes',
    ];

    /**
     * Atributos ocultos na serialização (JSON).
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Casts de atributos.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'pomodoro_duracao' => 'integer',
            'meta_diaria_questoes' => 'integer',
        ];
    }

    // ─── Relacionamentos ─────────────────────────────────────────

    /** Um usuário possui muitos concursos cadastrados */
    public function concursos()
    {
        return $this->hasMany(Concurso::class);
    }

    /** Um usuário possui muitas respostas registradas */
    public function responses()
    {
        return $this->hasMany(UserResponse::class);
    }

    /** Um usuário possui muitos SRS cards (revisão espaçada) */
    public function srsCards()
    {
        return $this->hasMany(SrsCard::class);
    }

    /** Um usuário possui muitas sessões Pomodoro */
    public function pomodoroSessions()
    {
        return $this->hasMany(PomodoroSession::class);
    }
}
