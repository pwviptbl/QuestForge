<?php

namespace App\Services;

use App\Models\BancaReferenceProfile;
use App\Models\Concurso;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Process;
use Illuminate\Validation\ValidationException;

class BancaReferenceService
{
    public function __construct(private readonly GeminiService $gemini) {}

    /** Analisa o PDF em memória e persiste somente o perfil, nunca o arquivo ou texto extraído. */
    public function analisar(Concurso $concurso, UploadedFile $arquivo, ?string $sourceUrl): BancaReferenceProfile
    {
        $result = Process::timeout(90)->run(['pdftotext', '-layout', $arquivo->getRealPath(), '-']);

        if ($result->failed() || mb_strlen(trim($result->output())) < 300) {
            throw ValidationException::withMessages([
                'arquivo' => ['Não foi possível extrair texto do PDF. Envie um PDF pesquisável ou com OCR.'],
            ]);
        }

        $texto = mb_substr($result->output(), 0, 100000);
        $questoes = $this->contarQuestoes($texto);
        $perfil = $this->gemini->analisarPerfilBanca(
            texto: $texto,
            banca: $concurso->banca ?: 'banca não informada',
            concurso: $concurso->nome,
        );

        return BancaReferenceProfile::create([
            'concurso_id' => $concurso->id,
            'source_name' => $arquivo->getClientOriginalName(),
            'source_url' => $sourceUrl,
            'question_count' => $questoes ?: 0,
            'profile' => $perfil,
        ]);
    }

    /**
     * A extração em layout preserva as duas colunas da FGV na mesma linha,
     * por exemplo: "29                         32". Em vez de procurar
     * somente "1." ou "1)", usa o maior número de questão encontrado nas
     * posições típicas de início de coluna. Assim, a contagem não depende da
     * diagramação específica de um caderno.
     */
    private function contarQuestoes(string $texto): int
    {
        preg_match_all('/(?:^|\R)\h*(\d{1,3})(?=\h*(?:\R|[[:upper:]]))|\h{2,}(\d{1,3})(?=\h*(?:\R|[[:upper:]]))/mu', $texto, $matches);

        $numeros = array_map('intval', array_merge($matches[1] ?? [], $matches[2] ?? []));
        $numeros = array_filter($numeros, fn (int $numero) => $numero >= 1 && $numero <= 200);

        return $numeros === [] ? 0 : max($numeros);
    }
}
