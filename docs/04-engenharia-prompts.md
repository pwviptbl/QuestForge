# 🤖 Engenharia de Prompts — QuestForge

## Estratégia de Integração com Gemini API

O backend Laravel orquestra dois tipos de requisições para a API do Gemini via `GeminiService`. Ambas utilizam **System Prompts** rigorosos para garantir respostas estruturadas e consistentes.

---

## 1. Prompt de Geração de Questões

### System Prompt

```
Você é um gerador de questões de concurso público brasileiro. Sua ÚNICA função é gerar questões no formato JSON estruturado. Siga estas regras OBRIGATORIAMENTE:

1. Gere EXATAMENTE {quantidade} questões sobre o tópico "{topico}" da matéria "{materia}".
2. Dificuldade: {dificuldade} (facil = conceitos básicos, medio = aplicação prática, dificil = pegadinhas e exceções).
3. Tipo: {tipo} (multipla_escolha = 5 alternativas A-E, certo_errado = apenas CERTO ou ERRADO).
4. As questões devem ser no estilo de bancas como CESPE, FCC, VUNESP e FGV.
5. Cada questão deve ter um enunciado claro, direto e sem ambiguidades.
6. Para múltipla escolha: exatamente UMA alternativa correta e 4 distratores plausíveis.
7. NÃO inclua explicações, apenas a questão e a resposta correta.

RETORNE EXCLUSIVAMENTE um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "questoes": [
    {
      "enunciado": "string",
      "tipo": "multipla_escolha" | "certo_errado",
      "dificuldade": "facil" | "medio" | "dificil",
      "alternativas": [
        {"letra": "A", "texto": "string"},
        {"letra": "B", "texto": "string"},
        {"letra": "C", "texto": "string"},
        {"letra": "D", "texto": "string"},
        {"letra": "E", "texto": "string"}
      ],
      "resposta_correta": "A" | "B" | "C" | "D" | "E" | "CERTO" | "ERRADO"
    }
  ]
}
```

### Variáveis do Template

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `{quantidade}` | int | 10 | Número de questões a gerar |
| `{topico}` | string | "Pontuação" | Tópico específico |
| `{materia}` | string | "Língua Portuguesa" | Matéria do concurso |
| `{dificuldade}` | string | "medio" | Nível de dificuldade |
| `{tipo}` | string | "multipla_escolha" | Tipo das questões |

### Configuração da API (Laravel)

```php
// config/gemini.php
return [
    'api_key' => env('GEMINI_API_KEY'),
    'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),

    // Configuração para geração de questões
    'generation' => [
        'temperature' => 0.7,        // Variação criativa moderada
        'top_p' => 0.9,
        'top_k' => 40,
        'max_output_tokens' => 8192, // Espaço suficiente para muitas questões
    ],

    // Configuração para explicações - mais determinística
    'explanation' => [
        'temperature' => 0.3,        // Mais focado e previsível
        'top_p' => 0.8,
        'top_k' => 20,
        'max_output_tokens' => 1024, // Explicações devem ser curtas
    ],
];
```

### Validação do Response (PHP)

```php
// app/Services/GeminiService.php

/**
 * Valida a estrutura do JSON retornado pelo Gemini.
 *
 * @param array $data JSON decodificado da resposta do Gemini
 * @throws \InvalidArgumentException Se a estrutura for inválida
 */
private function validarQuestoes(array $data): bool
{
    $questoes = $data['questoes'] ?? [];

    if (empty($questoes)) {
        throw new \InvalidArgumentException('Nenhuma questão retornada pelo Gemini');
    }

    foreach ($questoes as $index => $q) {
        // Campos obrigatórios
        foreach (['enunciado', 'tipo', 'resposta_correta'] as $campo) {
            if (!isset($q[$campo])) {
                throw new \InvalidArgumentException("Questão {$index}: campo '{$campo}' ausente");
            }
        }

        if ($q['tipo'] === 'multipla_escolha') {
            $alternativas = $q['alternativas'] ?? [];

            if (count($alternativas) !== 5) {
                throw new \InvalidArgumentException("Questão {$index}: deve ter 5 alternativas");
            }

            $letras = array_column($alternativas, 'letra');
            if ($letras !== ['A', 'B', 'C', 'D', 'E']) {
                throw new \InvalidArgumentException("Questão {$index}: letras inválidas");
            }

            if (!in_array($q['resposta_correta'], $letras)) {
                throw new \InvalidArgumentException("Questão {$index}: resposta não está nas alternativas");
            }
        } elseif ($q['tipo'] === 'certo_errado') {
            if (!in_array($q['resposta_correta'], ['CERTO', 'ERRADO'])) {
                throw new \InvalidArgumentException("Questão {$index}: resposta deve ser CERTO ou ERRADO");
            }
        }
    }

    return true;
}
```

---

## 2. Prompt de Explicação

### System Prompt

```
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
6. Se for uma questão de certo/errado, explique por que está CERTO ou ERRADO.
```

### User Prompt (enviado junto com o system prompt)

```
QUESTÃO:
{enunciado}

ALTERNATIVAS:
{alternativas_formatadas}

RESPOSTA CORRETA: {resposta_correta}
RESPOSTA DO ALUNO: {resposta_usuario}
O ALUNO {acertou_ou_errou}.

Explique de forma concisa e direta.
```

---

## 3. Prompt para Simulado Mesclado

### Prompt Adicional (complementa o Prompt de Geração)

```
Gere um simulado MESCLADO com questões distribuídas entre os seguintes tópicos:

{lista_topicos}

REGRAS DE DISTRIBUIÇÃO:
- Distribua as {quantidade} questões de forma equilibrada entre os tópicos listados.
- Varie a dificuldade: aproximadamente 30% fácil, 50% média, 20% difícil.
- A ordem das questões deve ser ALEATÓRIA (não agrupe por tópico).
- Inclua o campo "topico" em cada questão do JSON para rastreamento.

Formato adicional no JSON:
{
  "questoes": [
    {
      "topico": "nome_do_topico",
      "materia": "nome_da_materia",
      ... (demais campos padrão)
    }
  ]
}
```

---

## 4. Prompt para Dificuldade Adaptativa

### Prompt Adicional

```
O aluno tem o seguinte perfil de desempenho no tópico "{topico}":
- Taxa de acerto: {taxa_acerto}%
- Total de questões respondidas: {total_respondidas}
- Nível atual: {nivel}

CALIBRE A DIFICULDADE assim:
- Se taxa_acerto < 40%: gere 70% fácil, 30% médio (reforço de base)
- Se taxa_acerto entre 40-70%: gere 30% fácil, 50% médio, 20% difícil (progressão)
- Se taxa_acerto > 70%: gere 20% médio, 80% difícil (desafio)
```

---

## 5. Implementação do GeminiService (Laravel)

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    public function __construct()
    {
        $this->apiKey = config('gemini.api_key');
        $this->model = config('gemini.model');
    }

    /**
     * Gera questões usando a API do Gemini.
     */
    public function gerarQuestoes(
        string $materia,
        string $topico,
        int $quantidade,
        string $tipo,
        string $dificuldade
    ): array {
        $prompt = $this->montarPromptGeracao($materia, $topico, $quantidade, $tipo, $dificuldade);
        $config = config('gemini.generation');

        $response = $this->chamarApi($prompt, $config);
        $data = $this->extrairJson($response);
        $this->validarQuestoes($data);

        return $data['questoes'];
    }

    /**
     * Gera explicação para uma questão específica.
     */
    public function gerarExplicacao(array $questao, string $respostaUsuario, bool $acertou): string
    {
        $prompt = $this->montarPromptExplicacao($questao, $respostaUsuario, $acertou);
        $config = config('gemini.explanation');

        return $this->chamarApi($prompt, $config);
    }

    /**
     * Chama a API do Gemini com retry automático.
     */
    private function chamarApi(string $prompt, array $config, int $tentativa = 1): string
    {
        $maxTentativas = 3;

        try {
            $response = Http::timeout(30)
                ->post("{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}", [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]]
                    ],
                    'generationConfig' => $config,
                ]);

            if ($response->failed()) {
                throw new \RuntimeException("Gemini API retornou status {$response->status()}");
            }

            $data = $response->json();
            return $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        } catch (\Exception $e) {
            if ($tentativa < $maxTentativas) {
                // Backoff exponencial: 1s, 2s, 4s
                sleep(pow(2, $tentativa - 1));
                Log::warning("GeminiService: tentativa {$tentativa} falhou, retentando...", [
                    'error' => $e->getMessage()
                ]);
                return $this->chamarApi($prompt, $config, $tentativa + 1);
            }
            throw $e;
        }
    }

    /**
     * Tenta extrair JSON válido da resposta, mesmo com texto extra.
     */
    private function extrairJson(string $responseText): array
    {
        // Tenta parse direto
        $data = json_decode($responseText, true);
        if ($data !== null) {
            return $data;
        }

        // Tenta encontrar JSON dentro de markdown code blocks
        if (preg_match('/```json?\s*(.*?)\s*```/s', $responseText, $matches)) {
            $data = json_decode($matches[1], true);
            if ($data !== null) {
                return $data;
            }
        }

        // Tenta encontrar qualquer objeto JSON
        if (preg_match('/\{.*\}/s', $responseText, $matches)) {
            $data = json_decode($matches[0], true);
            if ($data !== null) {
                return $data;
            }
        }

        throw new \RuntimeException('Não foi possível extrair JSON da resposta do Gemini');
    }
}
```

---

## 6. Limites e Custos

| Métrica | Estimativa |
|---------|-----------|
| Tokens por questão (geração) | ~200-300 tokens |
| Tokens por explicação | ~300-500 tokens |
| Custo estimado por bateria de 10 questões (Gemini Flash) | ~$0.001 |
| Rate limit recomendado por usuário | 60 req/min |
| Cache de questões | Reutilizar questões já geradas para o mesmo tópico/dificuldade |
