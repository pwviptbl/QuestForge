# 📋 Funcionalidades — QuestForge

## 1. Módulo de Autenticação e Usuário

### 1.1 Cadastro e Login
- **Cadastro** com Nome, E-mail e Senha (hash bcrypt)
- **Login** com E-mail + Senha → retorna JWT (access + refresh token)
- **Recuperação de senha** via e-mail com token temporário (não implementar)
- **Validação** de e-mail único e força mínima da senha (não implementar)

### 1.2 Perfil de Estudo
- Histórico completo de **acertos e erros** por tópico
- **Taxa de acerto geral** e por matéria/tópico
- **Nível de proficiência** calculado automaticamente (Iniciante → Intermediário → Avançado)
- Configurações pessoais: duração do Pomodoro, meta diária de questões
- Últimos concursos cadastrados com progresso

---

## 2. Módulo de Gestão de Concursos (Syllabus Parser)

### 2.1 Cadastro de Edital Dinâmico
- **Input de texto livre** com sintaxe simplificada:
  ```
  Portugues-interpretação,pontuação,concordância;Matematica-soma,divisão,porcentagem
  ```
- **Validação em tempo real** da sintaxe inserida
- Preview da estrutura gerada antes de confirmar

### 2.2 Processamento de Estrutura
- Parser converte o texto em entidades relacionais:
  - `Concurso` → nome, data de prova, descrição
  - `Materia` → nome, pertence a um Concurso (1:N)
  - `Topico` → nome, pertence a uma Matéria (1:N)
- **Edição posterior**: adicionar/remover matérias e tópicos individualmente
- **Duplicação de edital**: reaproveitar estruturas de concursos anteriores

### 2.3 Exemplo de Fluxo
```
Input:  "Portugues-interpretação,pontuação;Matematica-soma,divisao"

Resultado:
├── Concurso: "Meu Concurso 2026"
│   ├── Matéria: Portugues
│   │   ├── Tópico: interpretação
│   │   └── Tópico: pontuação
│   └── Matéria: Matematica
│       ├── Tópico: soma
│       └── Tópico: divisao
```

---

## 3. Motor de Avaliação (Integração Gemini API)

### 3.1 Geração de Questões sob Demanda
- **Parâmetros configuráveis:**
  - Quantidade de questões: 5, 10, 15, 20, 30
  - Dificuldade: Fácil, Médio, Difícil ou Adaptativa (calibrada pelo perfil)
  - Tipo: Múltipla Escolha (4 ou 5 alternativas) ou Certo/Errado

- **Modos de escopo:**
  | Modo | Descrição |
  |------|-----------|
  | Simulado Mesclado | Sorteio aleatório entre todos os tópicos do concurso |
  | Matéria Específica | Questões apenas de uma matéria selecionada |
  | Tópico Específico | Questões focadas em um único tópico (ex: "Soma") |
  | Revisão SRS | Questões reagendadas pelo sistema de revisão espaçada |

### 3.2 Validação de Resposta
- Feedback **instantâneo** ao selecionar uma alternativa:
  - ✅ Resposta correta: destaque verde + contabilização de acerto
  - ❌ Resposta incorreta: destaque vermelho + exibição da resposta correta
- Registro em banco de cada tentativa (`UserResponse`)

### 3.3 Resolução Explicativa (On-Demand)
- **Botão "Gerar Explicação / Não domino"** disponível após responder
- Aciona prompt específico para a API Gemini focando:
  - Teoria estrita necessária para resolver a questão
  - Passo-a-passo da resolução lógica
  - Sem divagações ou conteúdo excessivo
- Marcar como "não domina" **ativa o SRS** para aquele tópico

---

## 4. Modo Pomodoro Integrado

### 4.1 Funcionamento
- Timer de **25 minutos** (configurável pelo usuário: 15, 25, 30, 45, 50 min)
- Durante o bloco ativo:
  - **Interface bloqueada** para novas configurações
  - Usuário só pode resolver a bateria atual de questões
  - Barra de progresso visual do tempo restante
- Pausa automática de **5 minutos** entre blocos (15 min a cada 4 blocos)

### 4.2 Registro de Sessão
- Cada Pomodoro concluído registra: duração, questões respondidas, taxa de acerto
- Estatísticas de Pomodoros por dia/semana no Dashboard

---

## 5. Sistema de Revisão Espaçada (SRS Automático)

### 5.1 Regras de Reagendamento
| Evento | Próxima revisão |
|--------|-----------------|
| Errou a questão | 1 dia |
| Clicou em "Gerar Explicação" | 1 dia |
| Acertou na 1ª revisão | 3 dias |
| Acertou na 2ª revisão | 7 dias |
| Acertou na 3ª revisão | 14 dias |
| Acertou na 4ª revisão | 30 dias (domínio) |

### 5.2 Fila de Revisão
- Ao iniciar uma bateria, o sistema verifica se há questões pendentes de revisão
- Questões SRS são **priorizadas** e inseridas na bateria automaticamente
- O usuário pode optar por bateria 100% de revisão (Modo "Revisão SRS")

---

## 6. Dashboard de Vulnerabilidades

### 6.1 Métricas Exibidas
- **Taxa de erro por tópico** — gráfico de barras ordenado do pior para o melhor
- **Taxa de erro por matéria** — visão macro do desempenho
- **Evolução temporal** — gráfico de linha mostrando progresso ao longo dos dias
- **Heatmap de estudo** — dias e horários com mais atividade
- **Questões pendentes de revisão** — contador com breakdown por matéria

### 6.2 Alertas Inteligentes
- Notificação quando um tópico está com taxa de erro > 60%
- Sugestão automática: "Foque em **Pontuação** hoje — taxa de erro: 72%"
- Destaque visual (vermelho/amarelo/verde) por tópico
