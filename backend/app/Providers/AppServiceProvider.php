<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Registra serviços da aplicação.
     */
    public function register(): void
    {
        //
    }

    /**
     * Inicializa os serviços da aplicação.
     */
    public function boot(): void
    {
        // ─── Sanctum: define a tabela de tokens personalizada se necessário ─
        // Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        // ─── Força HTTPS em produção ─────────────────────────────────────────
        if ($this->app->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }
    }
}
