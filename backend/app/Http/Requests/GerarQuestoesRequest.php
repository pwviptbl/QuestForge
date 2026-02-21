<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GerarQuestoesRequest extends FormRequest
{
    /**
     * Apenas usuários autenticados podem gerar questões.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Regras de validação para geração de bateria de questões.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Quantidade de questões a gerar
            'quantidade' => ['required', 'integer', 'in:5,10,15,20,30'],

            // Modo de escopo da bateria
            'modo' => ['required', 'string', 'in:topico,materia,concurso,revisao_srs'],

            // ID do contexto (tópico, matéria ou concurso)
            'topico_id' => ['required_if:modo,topico', 'integer', 'exists:topicos,id'],
            'materia_id' => ['required_if:modo,materia', 'integer', 'exists:materias,id'],
            'concurso_id' => ['required_if:modo,concurso', 'integer', 'exists:concursos,id'],

            // Configuração da questão
            'dificuldade' => ['required', 'string', 'in:facil,medio,dificil,adaptativa'],
            'tipo' => ['required', 'string', 'in:multipla_escolha,certo_errado,misto'],
        ];
    }

    /**
     * Mensagens de erro em português.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'quantidade.required' => 'Informe a quantidade de questões.',
            'quantidade.in' => 'Quantidade inválida. Escolha: 5, 10, 15, 20 ou 30.',
            'modo.required' => 'Informe o modo da bateria.',
            'modo.in' => 'Modo inválido. Escolha: topico, materia, concurso ou revisao_srs.',
            'topico_id.required_if' => 'O tópico é obrigatório no modo "tópico específico".',
            'materia_id.required_if' => 'A matéria é obrigatória no modo "matéria específica".',
            'concurso_id.required_if' => 'O concurso é obrigatório no modo "simulado mesclado".',
            'dificuldade.required' => 'Informe a dificuldade das questões.',
            'dificuldade.in' => 'Dificuldade inválida. Escolha: facil, medio, dificil ou adaptativa.',
            'tipo.required' => 'Informe o tipo das questões.',
            'tipo.in' => 'Tipo inválido. Escolha: multipla_escolha, certo_errado ou misto.',
        ];
    }
}
