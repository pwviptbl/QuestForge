# 🤖 Engenharia de Prompts — QuestForge

## Estratégia de Integração com Gemini API

O backend orquestra dois tipos de requisições para a API do Gemini. Ambas utilizam **System Prompts** rigorosos para garantir respostas estruturadas e consistentes.

---

## 1. Prompt de Geração de Questões

### System Prompt

```
Você é um gerador de questões de concurso público brasileiro. Sua ÚNICA função é gerar questões no formato JSON estruturado. Siga estas regras OBRIGATORIAMENTE:

1. Gere EXATAMENTE {quantidade} questões sobre o tópico "{topico}" da matéria "{materia}".
2. Dificuldade: {dificuldade} (facil = conceitos básicos, medio = aplicação prática, dificil = pegadinhas e exceções).
3. Tipo: {tipo} (multipla_escolha = 5 alternativas A-E, certo_errado = apenas CERTO ou ERRADO).
4. As questões devem ser no estilo de bancas como CESPE, FCC, VUNESP e FGV.
5. Cada questão deve ter um enunciado claro, direto e sem ambiguidades.
6. Para múltipla escolha: exatamente UMA alternativa correta e 4 distratores plausíveis.
7. NÃO inclua explicações, apenas a questão e a resposta correta.

RETORNE EXCLUSIVAMENTE um JSON válido no seguinte formato (sem markdown, sem texto adicional):
{
  "questoes": [
    {
      "enunciado": "string",
      "tipo": "multipla_escolha" | "certo_errado",
      "dificuldade": "facil" | "medio" | "dificil",
      "alternativas": [
        {"letra": "A", "texto": "string"},
        {"letra": "B", "texto": "string"},
        {"letra": "C", "texto": "string"},
        {"letra": "D", "texto": "string"},
        {"letra": "E", "texto": "string"}
      ],
      "resposta_correta": "A" | "B" | "C" | "D" | "E" | "CERTO" | "ERRADO"
    }
  ]
}
```

### Variáveis do Template

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `{quantidade}` | int | 10 | Número de questões a gerar |
| `{topico}` | string | "Pontuação" | Tópico específico |
| `{materia}` | string | "Língua Portuguesa" | Matéria do concurso |
| `{dificuldade}` | string | "medio" | Nível de dificuldade |
| `{tipo}` | string | "multipla_escolha" | Tipo das questões |

### Configuração da API

```python
# Configuração para geração de questões
generation_config = {
    "temperature": 0.7,        # Variação criativa moderada
    "top_p": 0.9,
    "top_k": 40,
    "max_output_tokens": 8192, # Espaço suficiente para muitas questões
    "response_mime_type": "application/json"  # Força resposta JSON
}
```

### Validação do Response

```python
# Checklist de validação após receber resposta do Gemini
def validar_questoes(response_json: dict) -> bool:
    """Valida a estrutura do JSON retornado pelo Gemini."""
    questoes = response_json.get("questoes", [])
    
    for q in questoes:
        assert "enunciado" in q, "Enunciado ausente"
        assert "tipo" in q, "Tipo ausente"
        assert "resposta_correta" in q, "Resposta correta ausente"
        
        if q["tipo"] == "multipla_escolha":
            assert len(q["alternativas"]) == 5, "Deve ter 5 alternativas"
            letras = [a["letra"] for a in q["alternativas"]]
            assert letras == ["A", "B", "C", "D", "E"], "Letras inválidas"
            assert q["resposta_correta"] in letras, "Resposta não está nas alternativas"
        
        elif q["tipo"] == "certo_errado":
            assert q["resposta_correta"] in ["CERTO", "ERRADO"]
    
    return True
```

---

## 2. Prompt de Explicação

### System Prompt

```
Você é um professor particular especialista em concursos públicos brasileiros. O aluno acabou de responder uma questão e precisa de uma explicação CONCISA e FOCADA.

REGRAS OBRIGATÓRIAS:
1. Explique APENAS a teoria necessária para resolver esta questão específica.
2. Seja DIRETO: máximo de 3 parágrafos.
3. Estruture assim:
   - Parágrafo 1: Conceito-chave envolvido (1-2 frases)
   - Parágrafo 2: Por que a alternativa correta está certa
   - Parágrafo 3: Erro comum que leva às alternativas incorretas (se aplicável)
4. NÃO divague. NÃO cite fontes. NÃO use linguagem acadêmica rebuscada.
5. Use linguagem simples e exemplos práticos quando possível.
6. Se for uma questão de certo/errado, explique por que está CERTO ou ERRADO.
```

### User Prompt (enviado junto com o system prompt)

```
QUESTÃO:
{enunciado}

ALTERNATIVAS:
{alternativas_formatadas}

RESPOSTA CORRETA: {resposta_correta}
RESPOSTA DO ALUNO: {resposta_usuario}
O ALUNO {acertou_ou_errou}.

Explique de forma concisa e direta.
```

### Configuração da API

```python
# Configuração para explicações - mais determinística
explanation_config = {
    "temperature": 0.3,        # Mais focado e previsível
    "top_p": 0.8,
    "top_k": 20,
    "max_output_tokens": 1024, # Explicações devem ser curtas
}
```

---

## 3. Prompt para Simulado Mesclado

### Prompt Adicional (complementa o Prompt de Geração)

```
Gere um simulado MESCLADO com questões distribuídas entre os seguintes tópicos:

{lista_topicos}

REGRAS DE DISTRIBUIÇÃO:
- Distribua as {quantidade} questões de forma equilibrada entre os tópicos listados.
- Varie a dificuldade: aproximadamente 30% fácil, 50% média, 20% difícil.
- A ordem das questões deve ser ALEATÓRIA (não agrupe por tópico).
- Inclua o campo "topico" em cada questão do JSON para rastreamento.

Formato adicional no JSON:
{
  "questoes": [
    {
      "topico": "nome_do_topico",
      "materia": "nome_da_materia",
      ... (demais campos padrão)
    }
  ]
}
```

---

## 4. Prompt para Dificuldade Adaptativa

### Prompt Adicional

```
O aluno tem o seguinte perfil de desempenho no tópico "{topico}":
- Taxa de acerto: {taxa_acerto}%
- Total de questões respondidas: {total_respondidas}
- Nível atual: {nivel}

CALIBRE A DIFICULDADE assim:
- Se taxa_acerto < 40%: gere 70% fácil, 30% médio (reforço de base)
- Se taxa_acerto entre 40-70%: gere 30% fácil, 50% médio, 20% difícil (progressão)
- Se taxa_acerto > 70%: gere 20% médio, 80% difícil (desafio)
```

---

## 5. Tratamento de Erros

### Retry Strategy

```python
# Estratégia de retry para falhas da API
RETRY_CONFIG = {
    "max_retries": 3,
    "backoff_factor": 2,        # 1s, 2s, 4s
    "retry_on_status": [429, 500, 503],
}
```

### Fallback para JSON Inválido

```python
# Se o Gemini retornar JSON inválido, tenta extrair e corrigir
import re
import json

def extrair_json(response_text: str) -> dict:
    """Tenta extrair JSON válido da resposta, mesmo com texto extra."""
    # Tenta parse direto
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass
    
    # Tenta encontrar o JSON dentro de markdown code blocks
    match = re.search(r'```json?\s*(.*?)\s*```', response_text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    
    # Tenta encontrar qualquer objeto JSON
    match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    
    raise ValueError("Não foi possível extrair JSON da resposta do Gemini")
```

---

## 6. Limites e Custos

| Métrica | Estimativa |
|---------|-----------|
| Tokens por questão (geração) | ~200-300 tokens |
| Tokens por explicação | ~300-500 tokens |
| Custo estimado por bateria de 10 questões (Gemini Flash) | ~$0.001 |
| Rate limit recomendado por usuário | 60 req/min |
| Cache de questões | Reutilizar questões já geradas para o mesmo tópico/dificuldade |
