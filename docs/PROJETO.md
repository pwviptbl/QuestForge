# Projeto QuestForge

## Objetivo

O QuestForge é uma plataforma para estudo ativo com geração de questões por IA, foco em revisão espaçada e acompanhamento de evolução.

## Problema que resolve

- Falta de rotina consistente de revisão
- Dificuldade em transformar edital em prática
- Excesso de leitura passiva sem retenção real

## Proposta

- Gerar questões a partir de edital/matéria
- Corrigir respostas e explicar o raciocínio
- Reagendar revisão com SRS conforme desempenho
- Expor progresso por dashboard

## Funcionalidades principais

- Autenticação de usuário
- Gestão de concursos, matérias e tópicos
- Geração e resolução de questões
- Registro de respostas e desempenho
- Sistema SRS (spaced repetition)
- Sessões Pomodoro

## Arquitetura

- Frontend React servido por Nginx
- Backend Laravel (PHP-FPM)
- PostgreSQL para dados transacionais
- Redis para cache/filas/sessão
- Docker Compose para orquestração

Fluxo simplificado:

`Cliente -> Nginx -> (/api) Laravel -> PostgreSQL/Redis`

`Cliente -> Nginx -> (/) Frontend estático`

## Diretrizes de produção

- Apenas Nginx exposto publicamente
- Banco e Redis apenas em loopback/rede interna
- `APP_DEBUG=false`
- Backup de banco antes de alterações críticas
- Deploy com validação de healthcheck `/api/health`

## Escopo de documentação

- Instalação e deploy: [`docs/INSTALACAO.md`](INSTALACAO.md)
- Referência técnica completa: [`docs/README.md`](README.md)
