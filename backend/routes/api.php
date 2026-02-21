<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConcursoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PomodoroController;
use App\Http\Controllers\QuestaoController;
use App\Http\Controllers\SrsController;
use Illuminate\Support\Facades\Route;

/*
|────────────────────────────────────────────────────────────────
| Rotas da API — QuestForge
|────────────────────────────────────────────────────────────────
| Todas as rotas usam o prefixo /api (definido em bootstrap/app.php)
| Autenticação via Laravel Sanctum (Bearer Token)
|
*/

// ─── Health Check ─────────────────────────────────────────────
Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'service' => 'QuestForge API',
    'version' => '1.0.0',
]));

// ─── Autenticação (rotas públicas) ────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1'); // max 5/min
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // previne brute force
});

// ─── Rotas protegidas (exige Bearer Token válido) ─────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Fase 1: Perfil do usuário ────────────────────────
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
    });

    // ── Fase 2: Concursos / Editais ──────────────────────
    Route::post('concursos/preview', [ConcursoController::class, 'preview']);
    Route::apiResource('concursos', ConcursoController::class);
    Route::post('concursos/{id}/materias', [ConcursoController::class, 'addMateria']);
    Route::delete('materias/{id}', [ConcursoController::class, 'destroyMateria']);
    Route::post('materias/{id}/topicos', [ConcursoController::class, 'addTopico']);
    Route::delete('topicos/{id}', [ConcursoController::class, 'destroyTopico']);

    // ── Fase 3: Questões e Respostas ─────────────────────
    Route::post('questoes/gerar', [QuestaoController::class, 'gerar'])->middleware('throttle:15,1'); // Previne overload da API Gemini/Gastos
    Route::post('respostas', [QuestaoController::class, 'registrarResposta']);
    Route::post('questoes/{id}/explicacao', [QuestaoController::class, 'gerarExplicacao']);

    // ── Fase 5: SRS (Revisão Espaçada) ───────────────────
    Route::get('srs/pendentes', [SrsController::class, 'pendentes']);
    Route::get('srs/resumo', [SrsController::class, 'resumo']);
    Route::get('srs/cards', [SrsController::class, 'cards']);
    Route::post('srs/{id}/resetar', [SrsController::class, 'resetar']);

    // ── Fase 5: Pomodoro ─────────────────────────────────
    Route::post('pomodoro', [PomodoroController::class, 'iniciar']);
    Route::put('pomodoro/{id}', [PomodoroController::class, 'atualizar']);
    Route::post('pomodoro/{id}/finalizar', [PomodoroController::class, 'finalizar']);
    Route::get('pomodoro/historico', [PomodoroController::class, 'historico']);
    Route::get('pomodoro/resumo', [PomodoroController::class, 'resumo']);

    // ── Fase 5: Dashboard ────────────────────────────────
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('dashboard/vulnerabilities', [DashboardController::class, 'vulnerabilities']);
});
