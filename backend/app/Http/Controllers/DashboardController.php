<?php

namespace App\Http\Controllers;

use App\Models\UserResponse;
use App\Services\SrsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(
        private readonly SrsService $srs
    ) {
    }

    /**
     * Retorna todas as estatísticas do dashboard do usuário.
     *
     * GET /api/dashboard/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        return response()->json([
            'geral' => $this->calcularGeral($userId),
            'por_materia' => $this->calcularPorMateria($userId),
            'evolucao' => $this->calcularEvolucao($userId),
            'vulnerabilidades' => $this->calcularVulnerabilidades($userId),
            'srs' => [
                'pendentes' => $this->srs->contarPendentes($userId),
                'por_materia' => $this->srs->pendentsPorMateria($userId),
            ],
            'pomodoro' => $this->calcularPomodoro($userId),
        ]);
    }

    /**
     * Retorna apenas as vulnerabilidades (tópicos com maior taxa de erro).
     *
     * GET /api/dashboard/vulnerabilities
     */
    public function vulnerabilities(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $limite = min((int) $request->get('limite', 10), 30);

        $dados = $this->calcularVulnerabilidadesTopicos($userId, $limite);

        return response()->json([
            'vulnerabilidades' => $dados,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // CÁLCULOS PRIVADOS
    // ─────────────────────────────────────────────────────────────

    /**
     * Métricas gerais do usuário.
     */
    private function calcularGeral(int $userId): array
    {
        $base = DB::table('user_responses')
            ->where('user_id', $userId)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN acertou THEN 1 ELSE 0 END) as acertos')
            ->first();

        $total = $base->total ?? 0;
        $acertos = $base->acertos ?? 0;

        // Sequência de dias com pelo menos 1 resposta
        $sequencia = $this->calcularSequenciaDias($userId);

        // Questões hoje
        $hoje = UserResponse::where('user_id', $userId)
            ->whereDate('created_at', today())
            ->count();

        return [
            'total' => $total,
            'acertos' => $acertos,
            'taxaAcerto' => $total > 0 ? round(($acertos / $total) * 100) : 0,
            'sequencia' => $sequencia,
            'hoje' => $hoje,
        ];
    }

    /**
     * Questões respondidas e taxa de acerto por matéria.
     */
    private function calcularPorMateria(int $userId): array
    {
        return DB::table('user_responses as ur')
            ->join('questoes as q', 'q.id', '=', 'ur.questao_id')
            ->join('topicos as t', 't.id', '=', 'q.topico_id')
            ->join('materias as m', 'm.id', '=', 't.materia_id')
            ->join('concursos as c', 'c.id', '=', 'm.concurso_id')
            ->where('ur.user_id', $userId)
            ->selectRaw('
                m.nome as materia,
                COUNT(*) as total,
                SUM(CASE WHEN ur.acertou THEN 1 ELSE 0 END) as acertos,
                ROUND(SUM(CASE WHEN ur.acertou THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as taxa_acerto
            ')
            ->groupBy('m.id', 'm.nome')
            ->orderByDesc('total')
            ->get()
            ->toArray();
    }

    /**
     * Evolução da taxa de acerto dos últimos 7 dias.
     */
    private function calcularEvolucao(int $userId): array
    {
        $dados = DB::table('user_responses')
            ->where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw("
                DATE(created_at) as data,
                COUNT(*) as total,
                SUM(CASE WHEN acertou THEN 1 ELSE 0 END) as acertos,
                ROUND(SUM(CASE WHEN acertou THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as acerto
            ")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('data')
            ->get();

        // Preenche dias sem atividade com 0
        $mapa = $dados->keyBy('data');
        $resultado = [];

        for ($i = 6; $i >= 0; $i--) {
            $data = now()->subDays($i)->format('Y-m-d');
            $dia = now()->subDays($i)->locale('pt_BR')->isoFormat('ddd');

            $resultado[] = [
                'dia' => $dia,
                'data' => $data,
                'acerto' => (float) ($mapa[$data]->acerto ?? 0),
                'total' => (int) ($mapa[$data]->total ?? 0),
            ];
        }

        return $resultado;
    }

    /**
     * Vulnerabilidades por matéria (maior taxa de erro, mínimo 5 respostas).
     */
    private function calcularVulnerabilidades(int $userId): array
    {
        return DB::table('user_responses as ur')
            ->join('questoes as q', 'q.id', '=', 'ur.questao_id')
            ->join('topicos as t', 't.id', '=', 'q.topico_id')
            ->join('materias as m', 'm.id', '=', 't.materia_id')
            ->where('ur.user_id', $userId)
            ->selectRaw('
                m.nome as materia,
                COUNT(*) as total,
                SUM(CASE WHEN NOT ur.acertou THEN 1 ELSE 0 END) as erros,
                ROUND(SUM(CASE WHEN NOT ur.acertou THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as erros_pct
            ')
            ->groupBy('m.id', 'm.nome')
            ->havingRaw('COUNT(*) >= 5') // mínimo de 5 respostas para ser relevante
            ->orderByDesc('erros_pct')
            ->limit(8)
            ->get()
            ->toArray();
    }

    /**
     * Vulnerabilidades detalhadas por tópico.
     */
    private function calcularVulnerabilidadesTopicos(int $userId, int $limite): array
    {
        return DB::table('user_responses as ur')
            ->join('questoes as q', 'q.id', '=', 'ur.questao_id')
            ->join('topicos as t', 't.id', '=', 'q.topico_id')
            ->join('materias as m', 'm.id', '=', 't.materia_id')
            ->where('ur.user_id', $userId)
            ->selectRaw('
                t.id as topico_id,
                t.nome as topico,
                m.nome as materia,
                COUNT(*) as total,
                SUM(CASE WHEN NOT ur.acertou THEN 1 ELSE 0 END) as erros,
                ROUND(SUM(CASE WHEN NOT ur.acertou THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as erros_pct
            ')
            ->groupBy('t.id', 't.nome', 'm.nome')
            ->havingRaw('COUNT(*) >= 3')
            ->orderByDesc('erros_pct')
            ->limit($limite)
            ->get()
            ->toArray();
    }

    /**
     * Resumo das sessões Pomodoro dos últimos 30 dias.
     */
    private function calcularPomodoro(int $userId): array
    {
        $resumo = DB::table('pomodoro_sessions')
            ->where('user_id', $userId)
            ->whereNotNull('finalizada_em')
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('
                COUNT(*) as total_sessoes,
                SUM(blocos_completados) as total_blocos,
                SUM(questoes_respondidas) as total_questoes
            ')
            ->first();

        return [
            'total_sessoes' => $resumo->total_sessoes ?? 0,
            'total_blocos' => $resumo->total_blocos ?? 0,
            'total_questoes' => $resumo->total_questoes ?? 0,
        ];
    }

    /**
     * Calcula a sequência de dias consecutivos com pelo menos 1 resposta.
     */
    private function calcularSequenciaDias(int $userId): int
    {
        $diasComAtividade = DB::table('user_responses')
            ->where('user_id', $userId)
            ->selectRaw('DATE(created_at) as data')
            ->groupByRaw('DATE(created_at)')
            ->orderByDesc('data')
            ->pluck('data')
            ->toArray();

        if (empty($diasComAtividade))
            return 0;

        $sequencia = 0;
        $diaAtual = now()->format('Y-m-d');

        foreach ($diasComAtividade as $dia) {
            if ($dia === $diaAtual || $dia === now()->subDays($sequencia)->format('Y-m-d')) {
                $sequencia++;
                $diaAtual = now()->subDays($sequencia)->format('Y-m-d');
            } else {
                break;
            }
        }

        return $sequencia;
    }
}
