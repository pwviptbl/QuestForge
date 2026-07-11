<?php

namespace App\Jobs;

use App\Models\Alternativa;
use App\Models\Concurso;
use App\Models\Materia;
use App\Models\Questao;
use App\Models\Topico;
use App\Services\GeminiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GerarQuestoesJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $userId,
        public string $modo,
        public int $quantidade,
        public string $tipo,
        public string $dificuldade,
        public ?int $contextoId,
        public ?string $banca,
        public string $taskId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(GeminiService $gemini): void
    {
        try {
            Cache::put("task_{$this->taskId}", ['status' => 'processing'], 600);

            $questoesGeradas = match ($this->modo) {
                'topico' => $this->gerarPorTopico($gemini),
                'materia' => $this->gerarPorMateria($gemini),
                'concurso' => $this->gerarPorConcurso($gemini),
                default => throw new \InvalidArgumentException("Modo '{$this->modo}' inválido para fila."),
            };

            Cache::put("task_{$this->taskId}", [
                'status' => 'completed',
                'questoes' => $questoesGeradas,
            ], 600);

        } catch (\Exception $e) {
            Log::error("Erro no GerarQuestoesJob: " . $e->getMessage(), [
                'exception' => $e,
                'task_id' => $this->taskId,
            ]);

            Cache::put("task_{$this->taskId}", [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ], 600);
        }
    }

    private function gerarPorTopico(GeminiService $gemini): array
    {
        $topico = Topico::with('materia')->findOrFail($this->contextoId);
        $topico->materia->concurso()->where('user_id', $this->userId)->firstOrFail();

        $difEfetiva = $this->resolverDificuldade($topico->id);

        $questoesRaw = $gemini->gerarQuestoes(
            materia: $topico->materia->nome,
            topico: $topico->nome,
            quantidade: $this->quantidade,
            tipo: $this->tipo,
            dificuldade: $difEfetiva,
            banca: $this->banca
        );

        return $this->persistirQuestoes($questoesRaw, $topico->id);
    }

    private function gerarPorMateria(GeminiService $gemini): array
    {
        $materia = Materia::with('topicos', 'concurso')
            ->whereHas('concurso', fn($q) => $q->where('user_id', $this->userId))
            ->findOrFail($this->contextoId);

        $topicosParaGemini = $materia->topicos->map(fn($t) => [
            'topico' => $t->nome,
            'materia' => $materia->nome,
            'id' => $t->id,
        ])->toArray();

        $questoesRaw = $gemini->gerarSimuladoMesclado($topicosParaGemini, $this->quantidade, $this->dificuldade, $this->tipo, $this->banca);

        return $this->persistirQuestoesComTopico($questoesRaw, $materia->topicos->keyBy('nome'));
    }

    private function gerarPorConcurso(GeminiService $gemini): array
    {
        $concurso = Concurso::where('user_id', $this->userId)
            ->with('materias.topicos')
            ->findOrFail($this->contextoId);

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

        $questoesRaw = $gemini->gerarSimuladoMesclado($topicosParaGemini, $this->quantidade, $this->dificuldade, $this->tipo, $this->banca);

        return $this->persistirQuestoesComTopico($questoesRaw, collect($topicosPorNome));
    }

    private function persistirQuestoes(array $questoesRaw, int $topicoId): array
    {
        $persistidas = [];

        DB::transaction(function () use ($questoesRaw, $topicoId, &$persistidas) {
            foreach ($questoesRaw as $qRaw) {
                $questao = Questao::create([
                    'topico_id' => $topicoId,
                    'enunciado' => $qRaw['enunciado'],
                    'tipo' => $qRaw['tipo'],
                    'banca' => $this->banca,
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

                $persistidas[] = $questao->load('alternativas');
            }
        });

        return $persistidas;
    }

    private function persistirQuestoesComTopico(array $questoesRaw, $topicosPorNome): array
    {
        $persistidas = [];

        DB::transaction(function () use ($questoesRaw, $topicosPorNome, &$persistidas) {
            foreach ($questoesRaw as $qRaw) {
                $nomeTopico = $qRaw['topico'] ?? null;
                $topico = $nomeTopico ? ($topicosPorNome[$nomeTopico] ?? $topicosPorNome->first()) : $topicosPorNome->first();

                $questao = Questao::create([
                    'topico_id' => $topico->id,
                    'enunciado' => $qRaw['enunciado'],
                    'tipo' => $qRaw['tipo'],
                    'banca' => $this->banca,
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

    private function resolverDificuldade(int $topicoId): string
    {
        if ($this->dificuldade !== 'adaptativa') {
            return $this->dificuldade;
        }

        $respostas = DB::table('user_responses as ur')
            ->join('questoes as q', 'q.id', '=', 'ur.questao_id')
            ->where('ur.user_id', $this->userId)
            ->where('q.topico_id', $topicoId)
            ->orderBy('ur.created_at', 'desc')
            ->limit(20)
            ->get(['ur.acertou']);

        if ($respostas->isEmpty()) {
            return 'facil';
        }

        $total = $respostas->count();
        $acertos = $respostas->where('acertou', true)->count();
        $taxa = ($acertos / $total) * 100;

        return match (true) {
            $taxa < 40 => 'facil',
            $taxa <= 70 => 'medio',
            default => 'dificil',
        };
    }
}
