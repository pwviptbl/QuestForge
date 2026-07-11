<?php

namespace Tests\Feature;

use App\Models\Concurso;
use App\Models\Materia;
use App\Models\Topico;
use App\Models\User;
use App\Jobs\GerarQuestoesJob;
use App\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

class BancaQuestoesTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_concurso_with_banca(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/concursos', [
            'nome' => 'Concurso Teste',
            'banca' => 'FGV',
            'descricao' => 'Concurso para Teste',
            'sintaxe_original' => 'Materia-topico1,topico2',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('concurso.banca', 'FGV');

        $this->assertDatabaseHas('concursos', [
            'nome' => 'Concurso Teste',
            'banca' => 'FGV',
        ]);
    }

    public function test_can_update_concurso_with_banca(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $concurso = Concurso::create([
            'user_id' => $user->id,
            'nome' => 'Original',
            'sintaxe_original' => 'Materia-topico1',
        ]);

        $response = $this->putJson("/api/concursos/{$concurso->id}", [
            'nome' => 'Atualizado',
            'banca' => 'CESPE',
            'sintaxe_original' => 'Materia-topico1',
        ]);

        $response->assertOk();
        $response->assertJsonPath('concurso.banca', 'CESPE');

        $this->assertDatabaseHas('concursos', [
            'id' => $concurso->id,
            'banca' => 'CESPE',
        ]);
    }

    public function test_generating_questions_dispatches_job_and_returns_queued_status(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $concurso = Concurso::create([
            'user_id' => $user->id,
            'nome' => 'Concurso',
            'sintaxe_original' => 'Materia-topico1',
        ]);
        $materia = Materia::create([
            'concurso_id' => $concurso->id,
            'nome' => 'Materia',
            'ordem' => 1
        ]);
        $topico = Topico::create([
            'materia_id' => $materia->id,
            'nome' => 'topico1',
            'ordem' => 1
        ]);

        $response = $this->postJson('/api/questoes/gerar', [
            'modo' => 'topico',
            'topico_id' => $topico->id,
            'quantidade' => 10,
            'dificuldade' => 'medio',
            'tipo' => 'multipla_escolha',
            'banca' => 'FCC',
        ]);

        $response->assertStatus(202);
        $response->assertJsonStructure(['status', 'task_id']);
        $taskId = $response->json('task_id');

        $this->assertEquals('pending', Cache::get("task_{$taskId}")['status']);

        Queue::assertPushed(GerarQuestoesJob::class, function ($job) use ($user, $topico, $taskId) {
            return $job->userId === $user->id &&
                $job->modo === 'topico' &&
                $job->quantidade === 10 &&
                $job->tipo === 'multipla_escolha' &&
                $job->dificuldade === 'medio' &&
                $job->contextoId === $topico->id &&
                $job->banca === 'FCC' &&
                $job->taskId === $taskId;
        });
    }

    public function test_can_check_task_status_endpoint(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $taskId = 'test-uuid-1234';
        Cache::put("task_{$taskId}", ['status' => 'completed', 'questoes' => []], 60);

        $response = $this->getJson("/api/questoes/task/{$taskId}");
        $response->assertOk();
        $response->assertJsonPath('status', 'completed');
    }

    public function test_job_execution_handles_generation_successfully(): void
    {
        $user = User::factory()->create();
        $concurso = Concurso::create([
            'user_id' => $user->id,
            'nome' => 'Concurso',
            'sintaxe_original' => 'Materia-topico1',
        ]);
        $materia = Materia::create([
            'concurso_id' => $concurso->id,
            'nome' => 'Materia',
            'ordem' => 1
        ]);
        $topico = Topico::create([
            'materia_id' => $materia->id,
            'nome' => 'topico1',
            'ordem' => 1
        ]);

        $this->mock(GeminiService::class, function (MockInterface $mock) {
            $mock->shouldReceive('gerarQuestoes')
                ->once()
                ->with('Materia', 'topico1', 5, 'multipla_escolha', 'medio', 'FGV')
                ->andReturn([
                    [
                        'enunciado' => 'Questao de teste da FGV?',
                        'tipo' => 'multipla_escolha',
                        'dificuldade' => 'medio',
                        'resposta_correta' => 'A',
                        'alternativas' => [
                            ['letra' => 'A', 'texto' => 'Alternativa A'],
                            ['letra' => 'B', 'texto' => 'Alternativa B'],
                            ['letra' => 'C', 'texto' => 'Alternativa C'],
                            ['letra' => 'D', 'texto' => 'Alternativa D'],
                            ['letra' => 'E', 'texto' => 'Alternativa E'],
                        ],
                    ]
                ]);
        });

        $taskId = 'test-job-uuid';
        $job = new GerarQuestoesJob($user->id, 'topico', 5, 'multipla_escolha', 'medio', $topico->id, 'FGV', $taskId);
        
        $job->handle(app(GeminiService::class));

        $task = Cache::get("task_{$taskId}");
        $this->assertEquals('completed', $task['status']);
        $this->assertCount(1, $task['questoes']);

        $this->assertDatabaseHas('questoes', [
            'topico_id' => $topico->id,
            'enunciado' => 'Questao de teste da FGV?',
            'banca' => 'FGV',
        ]);
    }
}
