<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl;
    private int $maxRetries;

    public function __construct()
    {
        $this->apiKey = config('gemini.api_key');
        $this->model = config('gemini.model');
        $this->baseUrl = config('gemini.base_url');
        $this->maxRetries = config('gemini.max_retries', 3);
    }

    // ─────────────────────────────────────────────────────────────
    // API PÚBLICA
    // ─────────────────────────────────────────────────────────────

    /**
     * Gera uma bateria de questões sobre um tópico específico.
     *
     * @param  string $materia
     * @param  string $topico
     * @param  int    $quantidade
     * @param  string $tipo       multipla_escolha | certo_errado | misto
     * @param  string $dificuldade facil | medio | dificil
     * @return array<int, array>  Lista de questões estruturadas
     */
    public function gerarQuestoes(
        string $materia,
        string $topico,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): array {
        $prompt = $this->montarPromptGeracao($materia, $topico, $quantidade, $tipo, $dificuldade);
        $config = config('gemini.generation_config');
        $texto = $this->chamarApi($prompt, $config);
        $data = $this->extrairJson($texto);

        $this->validarQuestoes($data, $tipo);

        return $data['questoes'];
    }

    /**
     * Gera questões de um simulado mesclado com múltiplos tópicos.
     *
     * @param  array<int, array{topico: string, materia: string}> $topicos
     * @param  int    $quantidade
     * @param  string $dificuldade facil | medio | dificil | adaptativa
     * @param  string $tipo       multipla_escolha | certo_errado | misto
     * @return array<int, array>
     */
    public function gerarSimuladoMesclado(
        array $topicos,
        int $quantidade,
        string $dificuldade,
        string $tipo
    ): array
    {
        $prompt = $this->montarPromptSimuladoMesclado($topicos, $quantidade, $dificuldade, $tipo);
        $config = config('gemini.generation_config');
        $texto = $this->chamarApi($prompt, $config);
        $data = $this->extrairJson($texto);

        $this->validarQuestoes($data, $tipo);

        return $data['questoes'];
    }

    /**
     * Gera uma explicação detalhada e concisa para uma questão respondida.
     *
     * @param  array  $questao        Dados da questão (enunciado, alternativas, resposta_correta)
     * @param  string $respostaUsuario Resposta que o usuário deu
     * @param  bool   $acertou        Se o usuário acertou ou não
     * @return string                 Texto da explicação
     */
    public function gerarExplicacao(array $questao, string $respostaUsuario, bool $acertou): string
    {
        $prompt = $this->montarPromptExplicacao($questao, $respostaUsuario, $acertou);
        $config = array_merge(config('gemini.generation_config'), [
            'temperature' => 0.3,   // Mais determinístico para explicações
            'max_output_tokens' => 1024,  // Explicações curtas
        ]);

        return $this->chamarApi($prompt, $config);
    }

    // ─────────────────────────────────────────────────────────────
    // MONTAGEM DE PROMPTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Monta o prompt de geração de questões para tópico único.
     */
    private function montarPromptGeracao(
        string $materia,
        string $topico,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): string {
        $tipoDescricao = match ($tipo) {
            'multipla_escolha' => 'múltipla escolha com exatamente 5 alternativas (A, B, C, D, E)',
            'certo_errado' => 'certo ou errado (resposta deve ser CERTO ou ERRADO)',
            default => 'misto (combinar múltipla escolha e certo/errado)',
        };

        $regraTipo = match ($tipo) {
            'multipla_escolha' => 'TODAS as questões devem ter "tipo": "multipla_escolha".',
            'certo_errado' => 'TODAS as questões devem ter "tipo": "certo_errado".',
            default => 'Quando usar "misto", distribua aproximadamente 70% múltipla escolha e 30% certo/errado.',
        };

        $difDescricao = match ($dificuldade) {
            'facil' => 'fácil (conceitos básicos, definições diretas)',
            'medio' => 'médio (aplicação prática e interpretação)',
            'dificil' => 'difícil (pegadinhas, exceções e casos especiais)',
            default => 'médio'
        };

        return <<<PROMPT
Você é um gerador de questões de concurso público brasileiro. Sua ÚNICA função é gerar questões no formato JSON estruturado. Siga estas regras OBRIGATORIAMENTE:

1. Gere EXATAMENTE {$quantidade} questões sobre o tópico "{$topico}" da matéria "{$materia}".
2. Dificuldade: {$difDescricao}.
3. Tipo: {$tipoDescricao}.
4. As questões devem ser no estilo de bancas como CESPE, FCC, VUNESP e FGV.
5. Cada questão deve ter um enunciado claro, direto e sem ambiguidades.
6. Para múltipla escolha: exatamente UMA alternativa correta e 4 distratores plausíveis.
7. {$regraTipo}
8. NÃO inclua explicações, apenas a questão e a resposta correta.

RETORNE EXCLUSIVAMENTE um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "questoes": [
    {
      "enunciado": "string",
      "tipo": "multipla_escolha|certo_errado",
      "dificuldade": "facil|medio|dificil",
      "alternativas": [
        {"letra": "A", "texto": "string"},
        {"letra": "B", "texto": "string"},
        {"letra": "C", "texto": "string"},
        {"letra": "D", "texto": "string"},
        {"letra": "E", "texto": "string"}
      ],
      "resposta_correta": "A|B|C|D|E|CERTO|ERRADO"
    }
  ]
}
PROMPT;
    }

    /**
     * Monta o prompt para simulado mesclado com múltiplos tópicos.
     */
    private function montarPromptSimuladoMesclado(
        array $topicos,
        int $quantidade,
        string $dificuldade,
        string $tipo
    ): string {
        // Formata lista de tópicos para o prompt
        $listaTopicos = collect($topicos)
            ->map(fn($t) => "- {$t['topico']} (Matéria: {$t['materia']})")
            ->implode("\n");

        $distribuicaoDif = $dificuldade === 'adaptativa'
            ? 'Varie a dificuldade: aproximadamente 30% fácil, 50% média, 20% difícil.'
            : "Todas as questões devem ter dificuldade: {$dificuldade}.";

        $regraTipo = match ($tipo) {
            'multipla_escolha' => 'TODAS as questões devem ser de múltipla escolha (5 alternativas A-E).',
            'certo_errado' => 'TODAS as questões devem ser de certo/errado (sem alternativas, resposta CERTO ou ERRADO).',
            default => 'Mix de tipos: prefira múltipla escolha (5 alternativas A-E), com até 30% sendo certo/errado.',
        };

        return <<<PROMPT
Você é um gerador de questões de concurso público brasileiro. Gere um simulado MESCLADO.

Tópicos disponíveis:
{$listaTopicos}

REGRAS:
1. Gere EXATAMENTE {$quantidade} questões distribuídas entre os tópicos listados.
2. {$distribuicaoDif}
3. A ordem das questões deve ser ALEATÓRIA (não agrupe por tópico).
4. Use estilo de bancas como CESPE, FCC, VUNESP e FGV.
5. {$regraTipo}

RETORNE EXCLUSIVAMENTE um JSON válido (sem markdown, sem texto adicional):
{
  "questoes": [
    {
      "topico": "nome_do_topico",
      "materia": "nome_da_materia",
      "enunciado": "string",
      "tipo": "multipla_escolha|certo_errado",
      "dificuldade": "facil|medio|dificil",
      "alternativas": [
        {"letra": "A", "texto": "string"},
        {"letra": "B", "texto": "string"},
        {"letra": "C", "texto": "string"},
        {"letra": "D", "texto": "string"},
        {"letra": "E", "texto": "string"}
      ],
      "resposta_correta": "A|B|C|D|E|CERTO|ERRADO"
    }
  ]
}
PROMPT;
    }

    /**
     * Monta o prompt de explicação de uma questão respondida.
     */
    private function montarPromptExplicacao(
        array $questao,
        string $respostaUsuario,
        bool $acertou
    ): string {
        $acertouOuErrou = $acertou ? 'ACERTOU a questão' : 'ERROU a questão';

        // Formata alternativas para o prompt
        $alternativasFormatadas = '';
        if (!empty($questao['alternativas'])) {
            foreach ($questao['alternativas'] as $alt) {
                $correta = $alt['letra'] === $questao['resposta_correta'] ? ' ✓ (CORRETA)' : '';
                $alternativasFormatadas .= "{$alt['letra']}) {$alt['texto']}{$correta}\n";
            }
        }

        return <<<PROMPT
Você é um professor particular especialista em concursos públicos brasileiros. O aluno acabou de responder uma questão e precisa de uma explicação CONCISA e FOCADA.

REGRAS OBRIGATÓRIAS:
1. Explique APENAS a teoria necessária para resolver esta questão específica.
2. Seja DIRETO: máximo de 3 parágrafos.
3. Estruture assim:
   - Parágrafo 1: Conceito-chave envolvido (1-2 frases)
   - Parágrafo 2: Por que a alternativa correta está certa
   - Parágrafo 3: Erro comum que leva às alternativas incorretas (se aplicável)
4. NÃO divague. NÃO cite fontes. NÃO use linguagem acadêmica rebuscada.
5. Use linguagem simples e exemplos práticos quando possível.

QUESTÃO:
{$questao['enunciado']}

ALTERNATIVAS:
{$alternativasFormatadas}
RESPOSTA CORRETA: {$questao['resposta_correta']}
RESPOSTA DO ALUNO: {$respostaUsuario}
O ALUNO {$acertouOuErrou}.

Explique de forma concisa e direta.
PROMPT;
    }

    // ─────────────────────────────────────────────────────────────
    // COMUNICAÇÃO COM A API
    // ─────────────────────────────────────────────────────────────

    /**
     * Chama a API do Gemini com retry automático e backoff exponencial.
     *
     * @param  string $prompt
     * @param  array  $config   Configuração de geração (temperature, max_tokens, etc.)
     * @param  int    $tentativa
     * @return string           Texto da resposta do Gemini
     *
     * @throws \RuntimeException Se todas as tentativas falharem
     */
    private function chamarApi(string $prompt, array $config, int $tentativa = 1): string
    {
        try {
            $url = "{$this->baseUrl}/{$this->model}:generateContent?key={$this->apiKey}";

            $response = Http::timeout(config('gemini.timeout', 60))
                ->post($url, [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]],
                    ],
                    'generationConfig' => $config,
                    // Instrução de segurança: responder sempre em PT-BR
                    'systemInstruction' => [
                        'parts' => [['text' => 'Responda sempre em português brasileiro.']],
                    ],
                ]);

            if ($response->failed()) {
                $status = $response->status();
                $body = $response->body();
                throw new \RuntimeException("Gemini API retornou status {$status}: {$body}");
            }

            $data = $response->json();

            // Extrai o texto da resposta
            $texto = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if (empty($texto)) {
                throw new \RuntimeException('Gemini retornou resposta vazia ou inesperada.');
            }

            return $texto;

        } catch (\Exception $e) {
            if ($tentativa < $this->maxRetries) {
                // Backoff exponencial: 1s, 2s, 4s
                $delay = (int) pow(2, $tentativa - 1);
                Log::warning("GeminiService: tentativa {$tentativa} falhou. Aguardando {$delay}s antes de retentar.", [
                    'error' => $e->getMessage(),
                ]);
                sleep($delay);

                return $this->chamarApi($prompt, $config, $tentativa + 1);
            }

            Log::error('GeminiService: todas as tentativas falharam.', [
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException(
                "Falha ao comunicar com a API Gemini após {$this->maxRetries} tentativas: " . $e->getMessage(),
                previous: $e
            );
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PARSING E VALIDAÇÃO DO JSON
    // ─────────────────────────────────────────────────────────────

    /**
     * Extrai JSON válido da resposta do Gemini (mesmo com texto/markdown extra).
     *
     * @param  string $responseText
     * @return array
     * @throws \RuntimeException
     */
    private function extrairJson(string $responseText): array
    {
        // 1. Tenta parse direto
        $data = json_decode($responseText, true);
        if ($data !== null) {
            return $data;
        }

        // 2. Tenta extrair de bloco de código markdown ```json ... ```
        if (preg_match('/```json?\s*(.*?)\s*```/s', $responseText, $matches)) {
            $data = json_decode($matches[1], true);
            if ($data !== null) {
                return $data;
            }
        }

        // 3. Tenta encontrar qualquer objeto JSON { ... }
        if (preg_match('/\{.*\}/s', $responseText, $matches)) {
            $data = json_decode($matches[0], true);
            if ($data !== null) {
                return $data;
            }
        }

        Log::error('GeminiService: não foi possível extrair JSON.', [
            'response_preview' => substr($responseText, 0, 500),
        ]);

        throw new \RuntimeException('Não foi possível extrair JSON válido da resposta do Gemini.');
    }

    /**
     * Valida a estrutura do array de questões retornado pelo Gemini.
     *
     * @param  array $data
     * @throws \InvalidArgumentException
     */
    private function validarQuestoes(array $data, string $tipoSolicitado = 'misto'): void
    {
        $questoes = $data['questoes'] ?? [];

        if (empty($questoes)) {
            throw new \InvalidArgumentException('Nenhuma questão retornada pelo Gemini.');
        }

        foreach ($questoes as $index => $q) {
            // Campos obrigatórios em todas as questões
            foreach (['enunciado', 'tipo', 'resposta_correta'] as $campo) {
                if (empty($q[$campo])) {
                    throw new \InvalidArgumentException("Questão #{$index}: campo '{$campo}' ausente ou vazio.");
                }
            }

            if ($tipoSolicitado !== 'misto' && $q['tipo'] !== $tipoSolicitado) {
                throw new \InvalidArgumentException(
                    "Questão #{$index}: tipo retornado '{$q['tipo']}' diverge do tipo solicitado '{$tipoSolicitado}'."
                );
            }

            // Validações específicas por tipo
            if ($q['tipo'] === 'multipla_escolha') {
                $alternativas = $q['alternativas'] ?? [];

                if (count($alternativas) !== 5) {
                    throw new \InvalidArgumentException("Questão #{$index}: múltipla escolha deve ter exatamente 5 alternativas.");
                }

                $letras = array_column($alternativas, 'letra');
                // if ($letras !== ['A', 'B', 'C', 'D', 'E']) {
                //    throw new \InvalidArgumentException("Questão #{$index}: alternativas devem ser A, B, C, D, E nessa ordem.");
                // }

                if (!in_array($q['resposta_correta'], $letras, true)) {
                    throw new \InvalidArgumentException("Questão #{$index}: resposta_correta '{$q['resposta_correta']}' não está nas alternativas.");
                }

            } elseif ($q['tipo'] === 'certo_errado') {
                if (!in_array($q['resposta_correta'], ['CERTO', 'ERRADO'], true)) {
                    throw new \InvalidArgumentException("Questão #{$index}: tipo certo_errado deve ter resposta CERTO ou ERRADO.");
                }
            } else {
                throw new \InvalidArgumentException("Questão #{$index}: tipo '{$q['tipo']}' inválido.");
            }
        }
    }

    /**
     * Gera um hash único para um conjunto de parâmetros de prompt
     * (usado para evitar geração duplicada de questões).
     *
     * @param  string $materia
     * @param  string $topico
     * @param  string $tipo
     * @param  string $dificuldade
     * @return string Hash SHA-256 de 64 caracteres
     */
    public function gerarPromptHash(
        string $materia,
        string $topico,
        string $tipo,
        string $dificuldade
    ): string {
        return hash('sha256', implode('|', [$materia, $topico, $tipo, $dificuldade]));
    }
}
