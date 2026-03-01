<?php

namespace App\Http\Controllers;

use App\Http\Requests\GerarQuestoesRequest;
use App\Models\Alternativa;
use App\Models\Materia;
use App\Models\Questao;
use App\Models\Topico;
use App\Models\UserResponse;
use App\Services\GeminiService;
use App\Services\SrsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestaoController extends Controller
{
    public function __construct(
        private readonly GeminiService $gemini,
        private readonly SrsService $srs
    ) {
    }

    /**
     * Gera uma bateria de questões via API Gemini e persiste no banco.
     *
     * POST /api/questoes/gerar
     */
    public function gerar(GerarQuestoesRequest $request): JsonResponse
    {
        $modo = $request->modo;
        $quantidade = $request->quantidade;
        $tipo = $request->tipo;
        $dificuldade = $request->dificuldade;

        // ── Resolve o contexto com base no modo ──────────────────
        $questoesGeradas = match ($modo) {
            'topico' => $this->gerarPorTopico($request, $quantidade, $tipo, $dificuldade),
            'materia' => $this->gerarPorMateria($request, $quantidade, $tipo, $dificuldade),
            'concurso' => $this->gerarPorConcurso($request, $quantidade, $tipo, $dificuldade),
            'revisao_srs' => $this->gerarRevisaoSrs($request, $quantidade),
            default => throw new \InvalidArgumentException("Modo '{$modo}' inválido."),
        };

        return response()->json([
            'message' => "Bateria de {$quantidade} questões gerada com sucesso.",
            'questoes' => $questoesGeradas,
            'total' => count($questoesGeradas),
        ], 201);
    }

    /**
     * Registra a resposta do usuário a uma questão e retorna o feedback.
     *
     * POST /api/respostas
     */
    public function registrarResposta(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'questao_id'         => ['required', 'integer', 'exists:questoes,id'],
            'resposta_usuario'   => ['required', 'string', 'max:10'],
            'tempo_resposta_seg' => ['nullable', 'integer', 'min:0', 'max:3600'],
            'modo'               => ['nullable', 'string', 'in:revisao_srs,topico,materia,concurso'],
        ]);

        $questao = Questao::with('alternativas')->findOrFail($validated['questao_id']);
        $acertou = strtoupper($validated['resposta_usuario']) === strtoupper($questao->resposta_correta);

        // Persiste a resposta
        $response = UserResponse::create([
            'user_id' => $request->user()->id,
            'questao_id' => $questao->id,
            'resposta_usuario' => strtoupper($validated['resposta_usuario']),
            'acertou' => $acertou,
            'tempo_resposta_seg' => $validated['tempo_resposta_seg'] ?? null,
        ]);

        // Atualiza o SRS:
        // - Errou → sempre cria/reseta card (revisão em 1 dia)
        // - Acertou EM REVISÃO SRS → avança o card (pode virar dominado)
        if (!$acertou) {
            $this->srs->criarOuAtualizar(
                userId: $request->user()->id,
                questaoId: $questao->id,
                topicoId: $questao->topico_id,
                acertou: false
            );
        } elseif (($validated['modo'] ?? null) === 'revisao_srs') {
            $this->srs->criarOuAtualizar(
                userId: $request->user()->id,
                questaoId: $questao->id,
                topicoId: $questao->topico_id,
                acertou: true
            );
        }

        return response()->json([
            'acertou' => $acertou,
            'resposta_correta' => $questao->resposta_correta,
            'resposta_usuario' => strtoupper($validated['resposta_usuario']),
            'response_id' => $response->id,
        ]);
    }

    /**
     * Gera uma explicação on-demand para uma questão e salva no banco.
     * Também ativa o SRS para esse tópico.
     *
     * POST /api/questoes/{id}/explicacao
     */
    public function gerarExplicacao(Request $request, int $id): JsonResponse
    {
        $questao = Questao::with('alternativas')->findOrFail($id);

        // Verifica se já existe explicação salva (evita chamada desnecessária à API)
        if (!empty($questao->explicacao)) {
            return response()->json([
                'explicacao' => $questao->explicacao,
                'cached' => true,
            ]);
        }

        $validated = $request->validate([
            'resposta_usuario' => ['required', 'string', 'max:10'],
            'response_id' => ['nullable', 'integer', 'exists:user_responses,id'],
        ]);

        $acertou = strtoupper($validated['resposta_usuario']) === strtoupper($questao->resposta_correta);

        // Formata dados da questão para o prompt
        $dadosQuestao = [
            'enunciado' => $questao->enunciado,
            'resposta_correta' => $questao->resposta_correta,
            'alternativas' => $questao->alternativas->map(fn($a) => [
                'letra' => $a->letra,
                'texto' => $a->texto,
            ])->toArray(),
        ];

        // Chama a API Gemini para gerar a explicação
        $explicacao = $this->gemini->gerarExplicacao(
            questao: $dadosQuestao,
            respostaUsuario: strtoupper($validated['resposta_usuario']),
            acertou: $acertou
        );

        // Salva a explicação na questão para cache futuro
        $questao->update(['explicacao' => $explicacao]);

        // Marca a resposta como "solicitou explicação"
        if (!empty($validated['response_id'])) {
            UserResponse::where('id', $validated['response_id'])
                ->where('user_id', $request->user()->id)
                ->update(['solicitou_explicacao' => true]);
        }

        // Solicitar explicação ativa SRS (quer tenha acertado ou não)
        $this->srs->criarOuAtualizar(
            userId: $request->user()->id,
            questaoId: $questao->id,
            topicoId: $questao->topico_id,
            acertou: false  // conta como dúvida, reinicia intervalo
        );

        return response()->json([
            'explicacao' => $explicacao,
            'cached' => false,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // MÉTODOS PRIVADOS DE GERAÇÃO
    // ─────────────────────────────────────────────────────────────

    /**
     * Gera questões focadas em um único tópico.
     */
    private function gerarPorTopico(
        GerarQuestoesRequest $request,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): array {
        $topico = Topico::with('materia')->findOrFail($request->topico_id);

        // Verifica se o tópico pertence ao usuário
        $topico->materia->concurso()->where('user_id', $request->user()->id)->firstOrFail();

        $tipoEfetivo = $tipo;
        $difEfetiva = $this->resolverDificuldade($dificuldade, $request->user()->id, $topico->id);

        $questoesRaw = $this->gemini->gerarQuestoes(
            materia: $topico->materia->nome,
            topico: $topico->nome,
            quantidade: $quantidade,
            tipo: $tipoEfetivo,
            dificuldade: $difEfetiva
        );

        return $this->persistirQuestoes($questoesRaw, $topico->id);
    }

    /**
     * Gera questões distribuídas entre os tópicos de uma matéria.
     */
    private function gerarPorMateria(
        GerarQuestoesRequest $request,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): array {
        $materia = Materia::with('topicos', 'concurso')
            ->whereHas('concurso', fn($q) => $q->where('user_id', $request->user()->id))
            ->findOrFail($request->materia_id);

        $topicosParaGemini = $materia->topicos->map(fn($t) => [
            'topico' => $t->nome,
            'materia' => $materia->nome,
            'id' => $t->id,
        ])->toArray();

        $questoesRaw = $this->gemini->gerarSimuladoMesclado($topicosParaGemini, $quantidade, $dificuldade, $tipo);

        return $this->persistirQuestoesComTopico($questoesRaw, $materia->topicos->keyBy('nome'));
    }

    /**
     * Gera simulado mesclado com todos os tópicos do concurso.
     */
    private function gerarPorConcurso(
        GerarQuestoesRequest $request,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): array {
        $concurso = $request->user()->concursos()
            ->with('materias.topicos')
            ->findOrFail($request->concurso_id);

        $topicosParaGemini = [];
        $topicosPorNome = [];

        foreach ($concurso->materias as $materia) {
            foreach ($materia->topicos as $topico) {
                $topicosParaGemini[] = [
                    'topico' => $topico->nome,
                    'materia' => $materia->nome,
                ];
                $topicosPorNome[$topico->nome] = $topico;
            }
        }

        if (empty($topicosParaGemini)) {
            throw new \RuntimeException('O concurso não possui tópicos cadastrados.');
        }

        $questoesRaw = $this->gemini->gerarSimuladoMesclado($topicosParaGemini, $quantidade, $dificuldade, $tipo);

        return $this->persistirQuestoesComTopico($questoesRaw, collect($topicosPorNome));
    }

    /**
     * Monta bateria de revisão com questões SRS pendentes do usuário.
     */
    private function gerarRevisaoSrs(Request $request, int $quantidade): array
    {
        $questoes = $this->srs->buscarPendentes($request->user()->id, $quantidade);

        return $questoes->map(fn($q) => $q->load('alternativas', 'topico.materia'))->toArray();
    }

    // ─────────────────────────────────────────────────────────────
    // PERSISTÊNCIA
    // ─────────────────────────────────────────────────────────────

    /**
     * Persiste questões de tópico único no banco.
     *
     * @param  array $questoesRaw   Array de questões vindas do Gemini
     * @param  int   $topicoId
     * @return array                Questões persistidas com alternativas
     */
    private function persistirQuestoes(array $questoesRaw, int $topicoId): array
    {
        $persistidas = [];

        DB::transaction(function () use ($questoesRaw, $topicoId, &$persistidas) {
            foreach ($questoesRaw as $qRaw) {
                $questao = Questao::create([
                    'topico_id' => $topicoId,
                    'enunciado' => $qRaw['enunciado'],
                    'tipo' => $qRaw['tipo'],
                    'dificuldade' => $qRaw['dificuldade'] ?? 'medio',
                    'resposta_correta' => $qRaw['resposta_correta'],
                ]);

                // Cria alternativas para múltipla escolha
                if ($qRaw['tipo'] === 'multipla_escolha' && !empty($qRaw['alternativas'])) {
                    foreach ($qRaw['alternativas'] as $alt) {
                        Alternativa::create([
                            'questao_id' => $questao->id,
                            'letra' => $alt['letra'],
                            'texto' => $alt['texto'],
                            'is_correta' => $alt['letra'] === $qRaw['resposta_correta'],
                        ]);
                    }
                }

                $persistidas[] = $questao->load('alternativas');
            }
        });

        return $persistidas;
    }

    /**
     * Persiste questões mescladas (com campo topico no JSON do Gemini).
     */
    private function persistirQuestoesComTopico(array $questoesRaw, $topicosPorNome): array
    {
        $persistidas = [];

        DB::transaction(function () use ($questoesRaw, $topicosPorNome, &$persistidas) {
            foreach ($questoesRaw as $qRaw) {
                // Encontra o tópico pelo nome retornado pelo Gemini
                $nomeTopico = $qRaw['topico'] ?? null;
                $topico = $nomeTopico ? ($topicosPorNome[$nomeTopico] ?? $topicosPorNome->first()) : $topicosPorNome->first();

                $questao = Questao::create([
                    'topico_id' => $topico->id,
                    'enunciado' => $qRaw['enunciado'],
                    'tipo' => $qRaw['tipo'],
                    'dificuldade' => $qRaw['dificuldade'] ?? 'medio',
                    'resposta_correta' => $qRaw['resposta_correta'],
                ]);

                if ($qRaw['tipo'] === 'multipla_escolha' && !empty($qRaw['alternativas'])) {
                    foreach ($qRaw['alternativas'] as $alt) {
                        Alternativa::create([
                            'questao_id' => $questao->id,
                            'letra' => $alt['letra'],
                            'texto' => $alt['texto'],
                            'is_correta' => $alt['letra'] === $qRaw['resposta_correta'],
                        ]);
                    }
                }

                $persistidas[] = $questao->load('alternativas', 'topico:id,nome');
            }
        });

        return $persistidas;
    }

    // ─────────────────────────────────────────────────────────────
    // UTILITÁRIOS
    // ─────────────────────────────────────────────────────────────

    /**
     * Resolve a dificuldade efetiva: se for "adaptativa", calcula com base
     * no histórico de respostas do usuário naquele tópico.
     */
    private function resolverDificuldade(string $dificuldade, int $userId, int $topicoId): string
    {
        if ($dificuldade !== 'adaptativa') {
            return $dificuldade;
        }

        // Calcula taxa de acerto das últimas 20 respostas do usuário neste tópico
        $respostas = DB::table('user_responses as ur')
            ->join('questoes as q', 'q.id', '=', 'ur.questao_id')
            ->where('ur.user_id', $userId)
            ->where('q.topico_id', $topicoId)
            ->orderBy('ur.created_at', 'desc')
            ->limit(20)
            ->get(['ur.acertou']);

        if ($respostas->isEmpty()) {
            return 'facil'; // Sem histórico: começa fácil
        }

        $total = $respostas->count();
        $acertos = $respostas->where('acertou', true)->count();
        $taxa = ($acertos / $total) * 100;

        return match (true) {
            $taxa < 40 => 'facil',   // Reforço de base
            $taxa <= 70 => 'medio',   // Progressão
            default => 'dificil', // Desafio
        };
    }
}
