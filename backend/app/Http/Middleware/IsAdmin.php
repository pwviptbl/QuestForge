<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Verifica se o usuário autenticado é administrador.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()?->is_admin) {
            return response()->json([
                'message' => 'Acesso negado. Você não tem permissão de administrador.',
            ], 403);
        }

        return $next($request);
    }
}
