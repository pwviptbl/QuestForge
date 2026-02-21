<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',       // registra as rotas da API
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ─── CORS: permite requisições do frontend React ───────────
        $middleware->validateCsrfTokens(except: [
            'api/*', // rotas da API são stateless (sem CSRF)
        ]);

        // Define os domínios stateful do Sanctum (frontend em dev)
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ─── Retorna erros 404 e 405 como JSON na rota /api ────────
        $exceptions->shouldRenderJsonWhen(function (Request $request) {
            return $request->is('api/*');
        });
    })
    ->create();
