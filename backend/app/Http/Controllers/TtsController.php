<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class TtsController extends Controller
{
    /**
     * Converte um trecho do quiz em áudio MP3 pelo serviço interno de TTS.
     */
    public function synthesize(Request $request): Response|JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:12000'],
        ]);

        try {
            $response = Http::acceptJson()
                ->timeout(60)
                ->post(rtrim(config('tts.url'), '/') . '/synthesize', [
                    'text' => $validated['text'],
                    'voice' => config('tts.voice'),
                ]);

            if ($response->failed()) {
                Log::warning('Serviço TTS retornou erro.', [
                    'status' => $response->status(),
                ]);

                return response()->json([
                    'message' => 'Não foi possível gerar o áudio agora.',
                ], 502);
            }

            return response($response->body(), 200, [
                'Content-Type' => 'audio/mpeg',
                'Cache-Control' => 'private, max-age=86400',
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Serviço TTS indisponível.', [
                'error' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Não foi possível gerar o áudio agora.',
            ], 503);
        }
    }
}
