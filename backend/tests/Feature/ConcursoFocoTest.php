<?php

namespace Tests\Feature;

use App\Models\Concurso;
use App\Models\Materia;
use App\Models\Questao;
use App\Models\SrsCard;
use App\Models\Topico;
use App\Models\User;
use App\Models\UserResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConcursoFocoTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_accepts_valid_focus_accepts_null_and_rejects_foreign_concurso(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $concurso = $this->createConcurso($user, 'Security+');
        $foreignConcurso = $this->createConcurso($otherUser, 'Outro Concurso');

        Sanctum::actingAs($user);

        $this->putJson('/api/auth/profile', [
            'concurso_foco_id' => $concurso->id,
        ])->assertOk()->assertJsonPath('user.concurso_foco_id', $concurso->id);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'concurso_foco_id' => $concurso->id,
        ]);

        $this->putJson('/api/auth/profile', [
            'concurso_foco_id' => null,
        ])->assertOk()->assertJsonPath('user.concurso_foco_id', null);

        $this->putJson('/api/auth/profile', [
            'concurso_foco_id' => $foreignConcurso->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['concurso_foco_id']);
    }

    public function test_dashboard_stats_respect_the_focused_concurso_and_return_to_global_when_focus_is_null(): void
    {
        $user = User::factory()->create();

        $security = $this->createConcursoTree($user, 'Security+', 'Redes', 'Protocolos');
        $software = $this->createConcursoTree($user, 'Engenharia', 'Algoritmos', 'Estruturas');

        $this->createUserResponse($user, $security['questao'], true);
        $this->createUserResponse($user, $software['questao'], false);

        $user->update(['concurso_foco_id' => $security['concurso']->id]);
        Sanctum::actingAs($user->fresh());

        $this->getJson('/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('geral.total', 1)
            ->assertJsonPath('geral.acertos', 1)
            ->assertJsonCount(1, 'por_materia')
            ->assertJsonPath('por_materia.0.materia', 'Redes');

        $user->update(['concurso_foco_id' => null]);
        Sanctum::actingAs($user->fresh());

        $this->getJson('/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('geral.total', 2)
            ->assertJsonCount(2, 'por_materia');
    }

    public function test_srs_endpoints_only_operate_within_the_focused_concurso(): void
    {
        $user = User::factory()->create();

        $security = $this->createConcursoTree($user, 'Security+', 'Redes', 'Protocolos');
        $securityExtraQuestion = $this->createQuestao($security['topico'], 'Questao dominada Security+');
        $software = $this->createConcursoTree($user, 'Engenharia', 'Algoritmos', 'Estruturas');

        $cardSecurityDue = $this->createSrsCard($user, $security['questao'], $security['topico'], [
            'status' => 'pendente',
            'repeticoes' => 0,
            'intervalo_atual_dias' => 1,
            'proxima_revisao' => now()->subHour(),
        ]);
        $this->createSrsCard($user, $securityExtraQuestion, $security['topico'], [
            'status' => 'dominado',
            'repeticoes' => 4,
            'intervalo_atual_dias' => 30,
            'proxima_revisao' => now()->addDays(30),
        ]);
        $cardSoftwareDue = $this->createSrsCard($user, $software['questao'], $software['topico'], [
            'status' => 'pendente',
            'repeticoes' => 0,
            'intervalo_atual_dias' => 1,
            'proxima_revisao' => now()->subHour(),
        ]);

        $user->update(['concurso_foco_id' => $security['concurso']->id]);
        Sanctum::actingAs($user->fresh());

        $this->getJson('/api/srs/pendentes')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'pendentes')
            ->assertJsonPath('pendentes.0.id', $security['questao']->id);

        $this->getJson('/api/srs/resumo')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonPath('dominado', 1)
            ->assertJsonPath('pendente', 1)
            ->assertJsonPath('vencidos', 1)
            ->assertJsonCount(1, 'por_materia');

        $this->getJson('/api/srs/cards')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.questao.id', $security['questao']->id);

        $this->postJson("/api/srs/{$cardSecurityDue->id}/resetar")
            ->assertOk()
            ->assertJsonPath('card.id', $cardSecurityDue->id);

        $this->postJson("/api/srs/{$cardSoftwareDue->id}/resetar")
            ->assertNotFound();
    }

    public function test_revisao_srs_generation_uses_the_focused_concurso_and_returns_empty_when_that_focus_has_no_pending_cards(): void
    {
        $user = User::factory()->create();

        $security = $this->createConcursoTree($user, 'Security+', 'Redes', 'Protocolos');
        $software = $this->createConcursoTree($user, 'Engenharia', 'Algoritmos', 'Estruturas');
        $emptyFocus = $this->createConcursoTree($user, 'Sem Revisao', 'Gestao', 'Processos');

        $this->createSrsCard($user, $security['questao'], $security['topico'], [
            'status' => 'pendente',
            'proxima_revisao' => now()->subMinute(),
        ]);
        $this->createSrsCard($user, $software['questao'], $software['topico'], [
            'status' => 'pendente',
            'proxima_revisao' => now()->subMinute(),
        ]);

        $user->update(['concurso_foco_id' => $security['concurso']->id]);
        Sanctum::actingAs($user->fresh());

        $payload = [
            'modo' => 'revisao_srs',
            'quantidade' => 5,
            'dificuldade' => 'medio',
            'tipo' => 'certo_errado',
        ];

        $this->postJson('/api/questoes/gerar', $payload)
            ->assertCreated()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('questoes.0.id', $security['questao']->id);

        $user->update(['concurso_foco_id' => $emptyFocus['concurso']->id]);
        Sanctum::actingAs($user->fresh());

        $this->postJson('/api/questoes/gerar', $payload)
            ->assertCreated()
            ->assertJsonPath('total', 0)
            ->assertJsonCount(0, 'questoes');
    }

    public function test_deleting_a_focused_concurso_clears_the_user_focus_by_foreign_key(): void
    {
        $user = User::factory()->create();
        $concurso = $this->createConcurso($user, 'Security+');

        $user->update(['concurso_foco_id' => $concurso->id]);

        $concurso->delete();

        $this->assertNull($user->fresh()->concurso_foco_id);
    }

    private function createConcurso(User $user, string $nome): Concurso
    {
        return Concurso::create([
            'user_id' => $user->id,
            'nome' => $nome,
            'descricao' => null,
            'data_prova' => now()->addMonth()->toDateString(),
            'sintaxe_original' => '',
        ]);
    }

    /**
     * @return array{concurso: Concurso, materia: Materia, topico: Topico, questao: Questao}
     */
    private function createConcursoTree(User $user, string $concursoNome, string $materiaNome, string $topicoNome): array
    {
        $concurso = $this->createConcurso($user, $concursoNome);
        $materia = Materia::create([
            'concurso_id' => $concurso->id,
            'nome' => $materiaNome,
            'ordem' => 1,
        ]);
        $topico = Topico::create([
            'materia_id' => $materia->id,
            'nome' => $topicoNome,
            'ordem' => 1,
        ]);

        return [
            'concurso' => $concurso,
            'materia' => $materia,
            'topico' => $topico,
            'questao' => $this->createQuestao($topico, "{$concursoNome} - {$topicoNome}"),
        ];
    }

    private function createQuestao(Topico $topico, string $enunciado): Questao
    {
        return Questao::create([
            'topico_id' => $topico->id,
            'enunciado' => $enunciado,
            'tipo' => 'certo_errado',
            'dificuldade' => 'medio',
            'resposta_correta' => 'CERTO',
        ]);
    }

    private function createUserResponse(User $user, Questao $questao, bool $acertou): UserResponse
    {
        return UserResponse::create([
            'user_id' => $user->id,
            'questao_id' => $questao->id,
            'resposta_usuario' => $acertou ? 'CERTO' : 'ERRADO',
            'acertou' => $acertou,
            'tempo_resposta_seg' => 30,
        ]);
    }

    private function createSrsCard(User $user, Questao $questao, Topico $topico, array $overrides = []): SrsCard
    {
        return SrsCard::create(array_merge([
            'user_id' => $user->id,
            'questao_id' => $questao->id,
            'topico_id' => $topico->id,
            'repeticoes' => 0,
            'intervalo_atual_dias' => 1,
            'fator_facilidade' => 2.5,
            'ultima_revisao' => now()->subDay(),
            'proxima_revisao' => now()->subHour(),
            'status' => 'pendente',
        ], $overrides));
    }
}
