<?php

return [

    /*
    |────────────────────────────────────────────────────────────────
    | Google Gemini API — Configuração
    |────────────────────────────────────────────────────────────────
    | Chave e modelo configurados via .env para nunca expor credenciais
    | no repositório. Usados pelo GeminiService.
    |
    */

    // Chave de API da Google AI Studio
    'api_key' => env('GEMINI_API_KEY', ''),

    // Modelo padrão: gemini-2.5-flash-lite
    // Vantagens sobre o 2.0-flash:
    //   • ~2x mais rápido (282 tokens/s vs 120 tokens/s)
    //   • Output até 65.536 tokens (vs 8.192 do 2.0-flash)
    //   • Knowledge cutoff mais recente (Jan/2025 vs Ago/2024)
    //   • Benchmarks gerais superiores (GPQA, MMMU, FACTS Grounding)
    'model' => env('GEMINI_MODEL', 'gemini-2.5-flash-lite'),

    // URL base da API Gemini
    'base_url' => 'https://generativelanguage.googleapis.com/v1beta/models',

    // Timeout das requisições em segundos
    'timeout' => 60,

    // Número máximo de tentativas em caso de falha (retry)
    'max_retries' => 3,

    // Delay inicial entre retries em milissegundos (dobra a cada tentativa)
    'retry_delay_ms' => 1000,

    // Configurações de geração padrão
    'generation_config' => [
        'temperature' => 0.7,    // Criatividade (0 = determinístico, 1 = criativo)
        'top_p' => 0.8,
        'top_k' => 40,
        'max_output_tokens' => 16384, // 2.5-flash-lite suporta até 65.536
    ],

];
