<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Lista todos os usuários.
     *
     * GET /api/admin/users
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::query()->orderBy('created_at', 'desc');

        // Filtro de busca por nome ou e-mail
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->get(['id', 'name', 'email', 'nivel', 'is_admin', 'is_blocked', 'plano', 'created_at']);

        return response()->json(['users' => $users]);
    }

    /**
     * Alterna o status de administrador de um usuário.
     *
     * PUT /api/admin/users/{id}/toggle-admin
     */
    public function toggleAdmin(Request $request, int $id): JsonResponse
    {
        $target = User::findOrFail($id);

        // Impede que o admin remova a si próprio
        if ($target->id === $request->user()->id) {
            return response()->json([
                'message' => 'Você não pode remover seu próprio acesso de administrador.',
            ], 422);
        }

        $target->update(['is_admin' => !$target->is_admin]);

        return response()->json([
            'message' => $target->is_admin
                ? "{$target->name} agora é administrador."
                : "{$target->name} não é mais administrador.",
            'user' => $target->only(['id', 'name', 'email', 'nivel', 'is_admin', 'is_blocked', 'plano', 'created_at']),
        ]);
    }

    /**
     * Alterna o bloqueio de um usuário.
     *
     * PUT /api/admin/users/{id}/toggle-block
     */
    public function toggleBlock(Request $request, int $id): JsonResponse
    {
        $target = User::findOrFail($id);

        // Impede que o admin bloqueie a si próprio
        if ($target->id === $request->user()->id) {
            return response()->json([
                'message' => 'Você não pode bloquear sua própria conta.',
            ], 422);
        }

        $target->update(['is_blocked' => !$target->is_blocked]);

        // Revoga todos os tokens do usuário bloqueado
        if ($target->is_blocked) {
            $target->tokens()->delete();
        }

        return response()->json([
            'message' => $target->is_blocked
                ? "{$target->name} foi bloqueado."
                : "{$target->name} foi desbloqueado.",
            'user' => $target->only(['id', 'name', 'email', 'nivel', 'is_admin', 'is_blocked', 'plano', 'created_at']),
        ]);
    }

    /**
     * Define o plano do usuário (free ou pro).
     *
     * PUT /api/admin/users/{id}/plano
     */
    public function setPlano(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'plano' => ['required', 'in:free,pro'],
        ]);

        $target = User::findOrFail($id);
        $target->update(['plano' => $request->plano]);

        $label = $request->plano === 'pro' ? 'PRO ⭐' : 'Free';

        return response()->json([
            'message' => "{$target->name} agora é {$label}.",
            'user'    => $target->only(['id', 'name', 'email', 'nivel', 'is_admin', 'is_blocked', 'plano', 'created_at']),
        ]);
    }

    /**
     * Exclui um usuário permanentemente.
     *
     * DELETE /api/admin/users/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $target = User::findOrFail($id);

        // Impede auto-exclusão
        if ($target->id === $request->user()->id) {
            return response()->json([
                'message' => 'Você não pode excluir sua própria conta por aqui.',
            ], 422);
        }

        // Revoga tokens antes de excluir
        $target->tokens()->delete();
        $target->delete();

        return response()->json([
            'message' => "Usuário {$target->name} excluído com sucesso.",
        ]);
    }
}
