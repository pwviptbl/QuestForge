<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BancaReferenceProfile extends Model
{
    use HasFactory;

    protected $fillable = ['concurso_id', 'source_name', 'source_url', 'question_count', 'profile'];

    protected function casts(): array
    {
        return ['profile' => 'array', 'question_count' => 'integer'];
    }

    public function concurso(): BelongsTo
    {
        return $this->belongsTo(Concurso::class);
    }
}
