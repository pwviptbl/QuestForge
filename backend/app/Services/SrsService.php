<?php

namespace App\Services;

use App\Models\SrsCard;
use Illuminate\Support\Collection;

/**
 * SrsService — Sistema de Revisão Espaçada (SM-2 simplificado).
 *
 * Intervalos de revisão:
 *   Errou ou pediu explicação → 1 dia
 *   Acertou na 1ª revisão    → 3 dias
 *   Acertou na 2ª revisão    → 7 dias
 *   Acertou na 3ª revisão    → 14 dias
 *   Acertou na 4ª revisão+   → 30 dias (domínio)
 */
class SrsService
{
    /** Tabela de intervalos em dias por número de repetições corretas */
    private const INTERVALOS = [0 => 1, 1 => 1, 2 => 3, 3 => 7, 4 => 14];
    private const INTERVALO_DOMINIO = 30;

    /**
     * Cria um novo SRS card ou atualiza o existente após uma resposta.
     *
     * @param  int  $userId
     * @param  int  $questaoId
     * @param  int  $topicoId
     * @param  bool $acertou
     * @return SrsCard
     */
    public function criarOuAtualizar(int $userId, int $questaoId, int $topicoId, bool $acertou): SrsCard
    {
        $card = SrsCard::firstOrNew([
            'user_id' => $userId,
            'questao_id' => $questaoId,
        ]);

        if (!$card->exists) {
            // Novo card: primeiro intervalo é sempre 1 dia
            $card->user_id = $userId;
            $card->questao_id = $questaoId;
            $card->topico_id = $topicoId;
            $card->repeticoes = 0;
            $card->status = 'pendente';
        }

        if ($acertou) {
            // Avança na sequência de intervalos
            $card->repeticoes++;
            $intervalo = $card->repeticoes >= 4
                ? self::INTERVALO_DOMINIO
                : (self::INTERVALOS[$card->repeticoes] ?? 1);

            $card->status = $card->repeticoes >= 4 ? 'dominado' : 'pendente';
        } else {
            // Errou ou pediu explicação: reset para 1 dia
            $card->repeticoes = 0;
            $intervalo = 1;
            $card->status = 'pendente';
        }

        $card->intervalo_atual_dias = $intervalo;
        $card->ultima_revisao = now();
        $card->proxima_revisao = now()->addDays($intervalo);
        $card->save();

        return $card;
    }

    /**
     * Busca questões pendentes de revisão SRS para o usuário.
     *
     * @param  int $userId
     * @param  int $limite  Máximo de questões a retornar
     * @return Collection<SrsCard>
     */
    public function buscarPendentes(int $userId, int $limite = 20): Collection
    {
        return SrsCard::where('user_id', $userId)
            ->where('status', 'pendente')
            ->where('proxima_revisao', '<=', now())
            ->with('questao.alternativas', 'questao.topico.materia')
            ->orderBy('proxima_revisao')
            ->limit($limite)
            ->get()
            ->pluck('questao'); // Retorna as questões, não os cards
    }

    /**
     * Conta quantas questões SRS estão pendentes de revisão.
     *
     * @param  int $userId
     * @return int
     */
    public function contarPendentes(int $userId): int
    {
        return SrsCard::where('user_id', $userId)
            ->where('status', 'pendente')
            ->where('proxima_revisao', '<=', now())
            ->count();
    }

    /**
     * Retorna o breakdown de pendentes por matéria.
     *
     * @param  int $userId
     * @return array
     */
    public function pendentsPorMateria(int $userId): array
    {
        return SrsCard::where('srs_cards.user_id', $userId)
            ->where('srs_cards.status', 'pendente')
            ->where('srs_cards.proxima_revisao', '<=', now())
            ->join('topicos', 'topicos.id', '=', 'srs_cards.topico_id')
            ->join('materias', 'materias.id', '=', 'topicos.materia_id')
            ->selectRaw('materias.nome as materia, COUNT(*) as pendentes')
            ->groupBy('materias.nome')
            ->orderByDesc('pendentes')
            ->get()
            ->toArray();
    }
}
