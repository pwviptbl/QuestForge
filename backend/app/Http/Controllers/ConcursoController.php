<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConcursoRequest;
use App\Models\Concurso;
use App\Models\Materia;
use App\Models\Topico;
use App\Services\SyllabusParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConcursoController extends Controller
{
    public function __construct(
        private readonly SyllabusParserService $parser
    ) {
    }

    /**
     * Lista todos os concursos do usuário autenticado.
     *
     * GET /api/concursos
     */
    public function index(Request $request): JsonResponse
    {
        $concursos = $request->user()
            ->concursos()
            ->withCount('materias')   // quantidade de matérias
            ->with('materias:id,concurso_id,nome,ordem') // carrega nomes das matérias
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['concursos' => $concursos]);
    }

    /**
     * Pré-visualiza a estrutura da sintaxe sem salvar no banco.
     *
     * POST /api/concursos/preview
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'sintaxe_original' => ['required', 'string'],
        ]);

        // Apenas faz o parse sem persistir, retorna a estrutura para o frontend exibir
        $estrutura = $this->parser->parse($request->sintaxe_original);

        return response()->json(['estrutura' => $estrutura]);
    }

    /**
     * Cria um novo concurso com toda a estrutura de matérias e tópicos.
     *
     * POST /api/concursos
     */
    public function store(ConcursoRequest $request): JsonResponse
    {
        $concurso = $this->parser->parseCriar(
            userId: $request->user()->id,
            dados: $request->validated()
        );

        return response()->json([
            'message' => 'Concurso criado com sucesso.',
            'concurso' => $concurso,
        ], 201);
    }

    /**
     * Exibe um concurso com toda a árvore de matérias e tópicos.
     *
     * GET /api/concursos/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $concurso = $request->user()
            ->concursos()
            ->with('materias.topicos')
            ->findOrFail($id);

        return response()->json(['concurso' => $concurso]);
    }

    /**
     * Atualiza metadados do concurso e/ou refaz o parse da sintaxe.
     *
     * PUT /api/concursos/{id}
     */
    public function update(ConcursoRequest $request, int $id): JsonResponse
    {
        /** @var Concurso $concurso */
        $concurso = $request->user()->concursos()->findOrFail($id);

        // Atualiza metadados simples
        $concurso->update([
            'nome' => $request->nome,
            'descricao' => $request->descricao,
            'data_prova' => $request->data_prova,
        ]);

        // Se a sintaxe mudou, refaz toda a estrutura de matérias/tópicos
        if ($request->sintaxe_original !== $concurso->sintaxe_original) {
            $concurso = $this->parser->parseAtualizar($concurso, $request->sintaxe_original);
        } else {
            $concurso->load('materias.topicos');
        }

        return response()->json([
            'message' => 'Concurso atualizado com sucesso.',
            'concurso' => $concurso,
        ]);
    }

    /**
     * Remove o concurso (cascade deleta matérias, tópicos e questões).
     *
     * DELETE /api/concursos/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $concurso = $request->user()->concursos()->findOrFail($id);
        $concurso->delete();

        return response()->json([
            'message' => 'Concurso excluído com sucesso.',
        ]);
    }

    /**
     * Adiciona uma matéria avulsa a um concurso existente.
     *
     * POST /api/concursos/{id}/materias
     */
    public function addMateria(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:100'],
            'topicos' => ['required', 'array', 'min:1'],
            'topicos.*' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        /** @var Concurso $concurso */
        $concurso = $request->user()->concursos()->findOrFail($id);

        // Define a ordem como o próximo número disponível
        $proximaOrdem = $concurso->materias()->max('ordem') + 1;

        $materia = Materia::create([
            'concurso_id' => $concurso->id,
            'nome' => $request->nome,
            'ordem' => $proximaOrdem,
        ]);

        // Cria os tópicos vinculados
        foreach ($request->topicos as $index => $nomeTopico) {
            Topico::create([
                'materia_id' => $materia->id,
                'nome' => trim($nomeTopico),
                'ordem' => $index,
            ]);
        }

        return response()->json([
            'message' => 'Matéria adicionada com sucesso.',
            'materia' => $materia->load('topicos'),
        ], 201);
    }

    /**
     * Adiciona um tópico avulso a uma matéria existente.
     *
     * POST /api/materias/{id}/topicos
     */
    public function addTopico(Request $request, int $materiaId): JsonResponse
    {
        $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        // Garante que a matéria pertence ao usuário autenticado
        $materia = Materia::whereHas('concurso', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($materiaId);

        $proximaOrdem = $materia->topicos()->max('ordem') + 1;

        $topico = Topico::create([
            'materia_id' => $materia->id,
            'nome' => trim($request->nome),
            'ordem' => $proximaOrdem,
        ]);

        return response()->json([
            'message' => 'Tópico adicionado com sucesso.',
            'topico' => $topico,
        ], 201);
    }

    /**
     * Remove uma matéria e todos os seus tópicos (cascade).
     *
     * DELETE /api/materias/{id}
     */
    public function destroyMateria(Request $request, int $materiaId): JsonResponse
    {
        $materia = Materia::whereHas('concurso', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($materiaId);

        $materia->delete();

        return response()->json([
            'message' => 'Matéria excluída com sucesso.',
        ]);
    }

    /**
     * Remove um tópico específico.
     *
     * DELETE /api/topicos/{id}
     */
    public function destroyTopico(Request $request, int $topicoId): JsonResponse
    {
        $topico = Topico::whereHas('materia.concurso', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($topicoId);

        $topico->delete();

        return response()->json([
            'message' => 'Tópico excluído com sucesso.',
        ]);
    }
}
