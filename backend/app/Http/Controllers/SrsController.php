<?php

namespace App\Http\Controllers;

use App\Services\SrsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SrsController extends Controller
{
    public function __construct(
        private readonly SrsService $srs
    ) {
    }

    /**
     * Lista questões pendentes de revisão (proxima_revisao <= agora).
     *
     * GET /api/srs/pendentes
     */
    public function pendentes(Request $request): JsonResponse
    {
        $limite = min((int) $request->get('limite', 20), 50);
        $concursoFocoId = $request->user()->concurso_foco_id;
        $questoes = $this->srs->buscarPendentes($request->user()->id, $limite, $concursoFocoId);

        return response()->json([
            'pendentes' => $questoes,
            'total' => $this->srs->contarPendentes($request->user()->id, $concursoFocoId),
            'por_materia' => $this->srs->pendentsPorMateria($request->user()->id, $concursoFocoId),
        ]);
    }

    /**
     * Retorna o resumo do progresso SRS do usuário.
     *
     * GET /api/srs/resumo
     */
    public function resumo(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $concursoFocoId = $request->user()->concurso_foco_id;
        $cardsQuery = $this->srs->scopedQuery($userId, $concursoFocoId);

        // Total de cards
        $total = (clone $cardsQuery)->count();
        $dominado = (clone $cardsQuery)->where('status', 'dominado')->count();
        $pendente = (clone $cardsQuery)->where('status', 'pendente')->count();
        $vencidos = $this->srs->contarPendentes($userId, $concursoFocoId);

        // Próximas 7 dias de revisões
        $agenda = (clone $cardsQuery)
            ->where('status', 'pendente')
            ->where('proxima_revisao', '>', now())
            ->where('proxima_revisao', '<=', now()->addDays(7))
            ->selectRaw("DATE(proxima_revisao) as data, COUNT(*) as quantidade")
            ->groupBy('data')
            ->orderBy('data')
            ->get();

        return response()->json([
            'total' => $total,
            'dominado' => $dominado,
            'pendente' => $pendente,
            'vencidos' => $vencidos,
            'agenda_7d' => $agenda,
            'por_materia' => $this->srs->pendentsPorMateria($userId, $concursoFocoId),
        ]);
    }

    /**
     * Reseta um card SRS para revisão imediata (útil quando o usuário
     * quer rever uma questão que julgou que já domina).
     *
     * POST /api/srs/{id}/resetar
     */
    public function resetar(Request $request, int $id): JsonResponse
    {
        $card = $this->srs
            ->scopedQuery($request->user()->id, $request->user()->concurso_foco_id)
            ->findOrFail($id);

        $card->update([
            'repeticoes' => 0,
            'intervalo_atual_dias' => 1,
            'status' => 'pendente',
            'proxima_revisao' => now(),
        ]);

        return response()->json([
            'message' => 'Card resetado para revisão imediata.',
            'card' => $card->fresh(),
        ]);
    }

    /**
     * Lista todos os cards SRS do usuário com filtro por status.
     *
     * GET /api/srs/cards
     */
    public function cards(Request $request): JsonResponse
    {
        $status = $request->get('status', 'pendente');

        $cards = $this->srs
            ->scopedQuery($request->user()->id, $request->user()->concurso_foco_id)
            ->when($status !== 'todos', fn($q) => $q->where('status', $status))
            ->with('questao:id,enunciado,tipo,dificuldade,resposta_correta', 'topico:id,nome')
            ->orderBy('proxima_revisao')
            ->paginate(30);

        return response()->json($cards);
    }
}
