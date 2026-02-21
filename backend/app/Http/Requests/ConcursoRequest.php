<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConcursoRequest extends FormRequest
{
    /**
     * Apenas usuários autenticados podem gerenciar concursos.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Regras de validação para criação/atualização de concurso.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'min:3', 'max:200'],
            'sintaxe_original' => ['required', 'string'],
            'descricao' => ['nullable', 'string', 'max:1000'],
            'data_prova' => ['nullable', 'date', 'after_or_equal:today'],
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
            'nome.required' => 'O nome do concurso é obrigatório.',
            'nome.min' => 'O nome deve ter pelo menos 3 caracteres.',
            'sintaxe_original.required' => 'A sintaxe do edital é obrigatória.',
            'data_prova.date' => 'Informe uma data de prova válida.',
            'data_prova.after_or_equal' => 'A data da prova não pode ser no passado.',
        ];
    }
}
