# 📚 QuestForge — Documentação do Projeto

> Plataforma de estudo orientada a IA com foco em **Active Recall**, **Revisão Espaçada** e **mitigação de dispersão**.

## Índice da Documentação

| Documento | Descrição |
|-----------|-----------|
| [Funcionalidades](./01-funcionalidades.md) | Mapeamento completo de todos os módulos e features da plataforma |
| [Arquitetura Técnica](./02-arquitetura.md) | Stack tecnológica, diagramas de componentes e fluxos de dados |
| [Modelagem de Dados](./03-modelagem-dados.md) | Schema do banco de dados relacional com todas as entidades e relacionamentos |
| [Engenharia de Prompts](./04-engenharia-prompts.md) | System prompts estruturados para integração com a API Gemini |
| [Planejamento de Implementação](./05-planejamento.md) | Roadmap por fases com entregáveis, prioridades e critérios de aceitação |
| [API Reference](./06-api-reference.md) | Endpoints REST da aplicação e contratos de request/response |

## Visão Geral

O **QuestForge** é uma plataforma web de estudo voltada para concurseiros e estudantes que utiliza inteligência artificial (Google Gemini) para:

- **Gerar questões** personalizadas a partir do edital do concurso
- **Validar respostas** com feedback instantâneo
- **Fornecer explicações sob demanda** focadas na teoria essencial
- **Reagendar revisões** automaticamente com base no desempenho (SRS)
- **Identificar vulnerabilidades** através de dashboards analíticos

## Princípios de Design

1. **Foco máximo** — Modo Pomodoro integrado para evitar dispersão
2. **Eficiência cognitiva** — Questões calibradas por dificuldade adaptativa
3. **Retenção de longo prazo** — Sistema de Revisão Espaçada (SRS) automático
4. **Simplicidade** — Interface limpa, sem ruído visual
