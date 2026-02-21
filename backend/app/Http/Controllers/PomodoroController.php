<?php

namespace App\Http\Controllers;

use App\Models\PomodoroSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PomodoroController extends Controller
{
    /**
     * Inicia uma nova sessão Pomodoro.
     *
     * POST /api/pomodoro
     */
    public function iniciar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'duracao_min' => ['required', 'integer', 'in:15,25,30,45,50'],
            'concurso_id' => ['nullable', 'integer', 'exists:concursos,id'],
        ]);

        $sessao = PomodoroSession::create([
            'user_id' => $request->user()->id,
            'concurso_id' => $validated['concurso_id'] ?? null,
            'duracao_min' => $validated['duracao_min'],
            'blocos_completados' => 0,
            'questoes_respondidas' => 0,
            'acertos' => 0,
            'iniciada_em' => now(),
        ]);

        return response()->json([
            'message' => 'Sessão Pomodoro iniciada.',
            'sessao' => $sessao,
        ], 201);
    }

    /**
     * Atualiza o progresso de uma sessão em andamento.
     *
     * PUT /api/pomodoro/{id}
     */
    public function atualizar(Request $request, int $id): JsonResponse
    {
        $sessao = PomodoroSession::where('user_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'blocos_completados' => ['sometimes', 'integer', 'min:0'],
            'questoes_respondidas' => ['sometimes', 'integer', 'min:0'],
            'acertos' => ['sometimes', 'integer', 'min:0'],
        ]);

        $sessao->update($validated);

        return response()->json([
            'message' => 'Sessão atualizada.',
            'sessao' => $sessao->fresh(),
        ]);
    }

    /**
     * Finaliza uma sessão Pomodoro.
     *
     * POST /api/pomodoro/{id}/finalizar
     */
    public function finalizar(Request $request, int $id): JsonResponse
    {
        $sessao = PomodoroSession::where('user_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'blocos_completados' => ['required', 'integer', 'min:0'],
            'questoes_respondidas' => ['required', 'integer', 'min:0'],
            'acertos' => ['required', 'integer', 'min:0'],
        ]);

        $sessao->update([
            ...$validated,
            'finalizada_em' => now(),
        ]);

        return response()->json([
            'message' => 'Sessão finalizada. Bom trabalho! 🎉',
            'sessao' => $sessao->fresh(),
            'duracao_real' => $sessao->duracaoRealMin(),
            'taxa_acerto' => $sessao->taxaAcertoPct(),
        ]);
    }

    /**
     * Lista o histórico de sessões Pomodoro do usuário.
     *
     * GET /api/pomodoro/historico
     */
    public function historico(Request $request): JsonResponse
    {
        $sessoes = PomodoroSession::where('user_id', $request->user()->id)
            ->whereNotNull('finalizada_em')
            ->with('concurso:id,nome')
            ->orderByDesc('iniciada_em')
            ->paginate(20);

        return response()->json($sessoes);
    }

    /**
     * Resumo agregado das sessões do usuário (últimos 30 dias).
     *
     * GET /api/pomodoro/resumo
     */
    public function resumo(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $desde = now()->subDays(30);

        $sessoes = PomodoroSession::where('user_id', $userId)
            ->where('iniciada_em', '>=', $desde)
            ->whereNotNull('finalizada_em')
            ->get();

        $totalBlocos = $sessoes->sum('blocos_completados');
        $totalQuestoes = $sessoes->sum('questoes_respondidas');
        $totalAcertos = $sessoes->sum('acertos');
        $totalSessoes = $sessoes->count();

        // Blocos por dia (últimos 7 dias)
        $blocosPorDia = PomodoroSession::where('user_id', $userId)
            ->where('iniciada_em', '>=', now()->subDays(7))
            ->whereNotNull('finalizada_em')
            ->selectRaw("DATE(iniciada_em) as data, SUM(blocos_completados) as blocos")
            ->groupBy('data')
            ->orderBy('data')
            ->get();

        return response()->json([
            'periodo_dias' => 30,
            'total_sessoes' => $totalSessoes,
            'total_blocos' => $totalBlocos,
            'tempo_foco_h' => round($totalBlocos * ($request->user()->pomodoro_duracao ?? 25) / 60, 1),
            'total_questoes' => $totalQuestoes,
            'taxa_acerto_pct' => $totalQuestoes > 0
                ? round(($totalAcertos / $totalQuestoes) * 100, 1)
                : 0,
            'blocos_por_dia' => $blocosPorDia,
        ]);
    }
}
