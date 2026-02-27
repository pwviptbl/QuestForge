<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Registra um novo usuário e retorna o token de acesso.
     *
     * POST /api/auth/register
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        // Cria o usuário com os dados validados — conta bloqueada até aprovação do administrador
        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => $request->password,
            'is_blocked' => true,
        ]);

        return response()->json([
            'message' => 'Cadastro realizado com sucesso. Aguarde a aprovação de um administrador para acessar sua conta.',
        ], 201);
    }

    /**
     * Autentica o usuário e retorna um novo token de acesso.
     *
     * POST /api/auth/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        // Verifica as credenciais
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Credenciais inválidas.',
            ], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        // Impede login de usuários bloqueados / pendentes de aprovação
        if ($user->is_blocked) {
            Auth::logout();
            return response()->json([
                'message' => 'Sua conta está aguardando aprovação de um administrador. Você receberá acesso assim que sua conta for liberada.',
                'code'    => 'ACCOUNT_PENDING',
            ], 403);
        }

        // Revoga tokens antigos para manter apenas um ativo por vez
        $user->tokens()->delete();

        // Gera novo token
        $token = $user->createToken('questforge-token')->plainTextToken;

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Retorna os dados do usuário autenticado.
     *
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    /**
     * Encerra a sessão do usuário (revoga o token atual).
     *
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        // Revoga somente o token que está sendo usado na requisição
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }

    /**
     * Atualiza as configurações de perfil do usuário autenticado.
     *
     * PUT /api/auth/profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:100'],
            'pomodoro_duracao' => ['sometimes', 'integer', 'in:15,25,30,45,50'],
            'meta_diaria_questoes' => ['sometimes', 'integer', 'min:5', 'max:100'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Perfil atualizado com sucesso.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Altera a senha do usuário autenticado.
     *
     * PUT /api/auth/password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password'      => ['required', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Senha atual incorreta.',
                'errors'  => ['current_password' => ['A senha atual está incorreta.']],
            ], 422);
        }

        $user->update(['password' => $request->password]);

        // Revoga todos os tokens e cria um novo
        $user->tokens()->delete();
        $token = $user->createToken('questforge-token')->plainTextToken;

        return response()->json([
            'message' => 'Senha alterada com sucesso.',
            'token'   => $token,
        ]);
    }
}
