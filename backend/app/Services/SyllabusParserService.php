<?php

namespace App\Services;

use App\Models\Concurso;
use App\Models\Materia;
use App\Models\Topico;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SyllabusParserService
{
    /**
     * Faz o parse da sintaxe do edital e cria o concurso com
     * todas as matérias e tópicos de forma atômica (dentro de uma transação).
     *
     * Formato aceito:
     *   Materia1-topico1,topico2,topico3;Materia2-topicoA,topicoB
     *
     * Exemplo:
     *   Portugues-interpretação,pontuação;Matematica-soma,divisao,porcentagem
     *
     * @param  int    $userId          ID do usuário autenticado
     * @param  array  $dados           Dados do concurso (nome, descricao, data_prova, sintaxe_original)
     * @return Concurso                Concurso criado com materias e topicos carregados
     *
     * @throws ValidationException    Se a sintaxe estiver inválida
     */
    public function parseCriar(int $userId, array $dados): Concurso
    {
        // Valida e estrutura a sintaxe antes de persistir qualquer coisa
        $estrutura = $this->parse($dados['sintaxe_original']);

        return DB::transaction(function () use ($userId, $dados, $estrutura) {
            // Cria o concurso
            $concurso = Concurso::create([
                'user_id' => $userId,
                'nome' => $dados['nome'],
                'descricao' => $dados['descricao'] ?? null,
                'data_prova' => $dados['data_prova'] ?? null,
                'sintaxe_original' => $dados['sintaxe_original'],
            ]);

            // Cria matérias e tópicos na ordem em que aparecem
            foreach ($estrutura as $ordemMateria => $item) {
                $materia = Materia::create([
                    'concurso_id' => $concurso->id,
                    'nome' => $item['materia'],
                    'ordem' => $ordemMateria,
                ]);

                foreach ($item['topicos'] as $ordemTopico => $nomeTopico) {
                    Topico::create([
                        'materia_id' => $materia->id,
                        'nome' => $nomeTopico,
                        'ordem' => $ordemTopico,
                    ]);
                }
            }

            // Retorna o concurso com toda a árvore carregada
            return $concurso->load('materias.topicos');
        });
    }

    /**
     * Faz o parse da sintaxe e retorna a estrutura como array,
     * sem persistir no banco. Usado para preview e validação.
     *
     * @param  string $sintaxe
     * @return array<int, array{materia: string, topicos: list<string>}>
     *
     * @throws ValidationException
     */
    public function parse(string $sintaxe): array
    {
        $sintaxe = trim($sintaxe);

        if (empty($sintaxe)) {
            throw ValidationException::withMessages([
                'sintaxe_original' => ['A sintaxe do edital não pode ser vazia.'],
            ]);
        }

        // Divide em blocos de matéria (separados por ponto-e-vírgula)
        $blocos = array_filter(array_map('trim', explode(';', $sintaxe)));

        if (empty($blocos)) {
            throw ValidationException::withMessages([
                'sintaxe_original' => ['Nenhuma matéria encontrada na sintaxe.'],
            ]);
        }

        $estrutura = [];
        $materiasVistas = [];

        foreach ($blocos as $bloco) {
            // Cada bloco deve ter o formato: NomeMateria-topico1,topico2
            if (!str_contains($bloco, '-')) {
                throw ValidationException::withMessages([
                    'sintaxe_original' => [
                        "Formato inválido no bloco: \"{$bloco}\". Use: NomeMateria-topico1,topico2",
                    ],
                ]);
            }

            // Separa apenas no PRIMEIRO hífen para permitir hífens nos nomes
            $posHifen = strpos($bloco, '-');
            $nomeMateria = trim(substr($bloco, 0, $posHifen));
            $topicosStr = trim(substr($bloco, $posHifen + 1));

            if (empty($nomeMateria)) {
                throw ValidationException::withMessages([
                    'sintaxe_original' => ['O nome da matéria não pode ser vazio.'],
                ]);
            }

            // Verifica matéria duplicada
            $nomeNormalizado = mb_strtolower($nomeMateria);
            if (in_array($nomeNormalizado, $materiasVistas, true)) {
                throw ValidationException::withMessages([
                    'sintaxe_original' => ["Matéria duplicada encontrada: \"{$nomeMateria}\"."],
                ]);
            }
            $materiasVistas[] = $nomeNormalizado;

            // Processa tópicos (separados por vírgula)
            $topicos = array_values(
                array_unique(
                    array_filter(
                        array_map('trim', explode(',', $topicosStr))
                    )
                )
            );

            if (empty($topicos)) {
                throw ValidationException::withMessages([
                    'sintaxe_original' => ["A matéria \"{$nomeMateria}\" não possui tópicos."],
                ]);
            }

            $estrutura[] = [
                'materia' => $nomeMateria,
                'topicos' => $topicos,
            ];
        }

        return $estrutura;
    }

    /**
     * Atualiza a sintaxe de um concurso existente:
     * remove matérias/tópicos que saíram e adiciona os novos.
     *
     * @param  Concurso $concurso
     * @param  string   $novaSintaxe
     * @return Concurso
     *
     * @throws ValidationException
     */
    public function parseAtualizar(Concurso $concurso, string $novaSintaxe): Concurso
    {
        $estrutura = $this->parse($novaSintaxe);

        return DB::transaction(function () use ($concurso, $novaSintaxe, $estrutura) {
            // Remove todas as matérias antigas (cascade deleta os tópicos)
            $concurso->materias()->delete();

            // Atualiza a sintaxe original
            $concurso->update(['sintaxe_original' => $novaSintaxe]);

            // Recria toda a estrutura
            foreach ($estrutura as $ordemMateria => $item) {
                $materia = Materia::create([
                    'concurso_id' => $concurso->id,
                    'nome' => $item['materia'],
                    'ordem' => $ordemMateria,
                ]);

                foreach ($item['topicos'] as $ordemTopico => $nomeTopico) {
                    Topico::create([
                        'materia_id' => $materia->id,
                        'nome' => $nomeTopico,
                        'ordem' => $ordemTopico,
                    ]);
                }
            }

            return $concurso->fresh()->load('materias.topicos');
        });
    }
}
