import { useCallback, useRef, useState } from 'react'
import api from '../api/client'

/**
 * Hook usePomodoroSession
 * Integra o timer Pomodoro com a API de sessões do backend.
 * Mantém a sessão ativa sincronizada e finaliza ao terminar.
 *
 * @param {number|null} concursoId  ID do concurso ativo (opcional)
 * @param {number}      duracaoMin  Duração do bloco de foco em minutos
 */
export function usePomodoroSession(concursoId = null, duracaoMin = 25) {
    const [sessaoId, setSessaoId] = useState(null)
    const [sincronizando, setSincronizando] = useState(false)
    const dadosRef = useRef({ blocos: 0, questoes: 0, acertos: 0 })

    // ─── Inicia sessão no backend ──────────────────────────────
    const iniciarSessao = useCallback(async () => {
        try {
            const { data } = await api.post('/pomodoro', {
                duracao_min: duracaoMin,
                concurso_id: concursoId,
            })
            setSessaoId(data.sessao.id)
            return data.sessao.id
        } catch {
            // Silencia erro — o timer funciona mesmo sem persistência
        }
    }, [duracaoMin, concursoId])

    // ─── Registra bloco completado ─────────────────────────────
    const registrarBloco = useCallback(async (questoesBloco = 0, acertosBloco = 0) => {
        dadosRef.current.blocos++
        dadosRef.current.questoes += questoesBloco
        dadosRef.current.acertos += acertosBloco

        if (!sessaoId) return
        try {
            await api.put(`/pomodoro/${sessaoId}`, {
                blocos_completados: dadosRef.current.blocos,
                questoes_respondidas: dadosRef.current.questoes,
                acertos: dadosRef.current.acertos,
            })
        } catch {
            // Silencia — update assíncrono, não critico
        }
    }, [sessaoId])

    // ─── Finaliza sessão no backend ────────────────────────────
    const finalizarSessao = useCallback(async (questoesExtra = 0, acertosExtra = 0) => {
        if (!sessaoId) return null
        setSincronizando(true)
        dadosRef.current.questoes += questoesExtra
        dadosRef.current.acertos += acertosExtra
        try {
            const { data } = await api.post(`/pomodoro/${sessaoId}/finalizar`, {
                blocos_completados: dadosRef.current.blocos,
                questoes_respondidas: dadosRef.current.questoes,
                acertos: dadosRef.current.acertos,
            })
            setSessaoId(null)
            return data
        } catch {
            return null
        } finally {
            setSincronizando(false)
        }
    }, [sessaoId])

    return {
        sessaoId,
        sincronizando,
        iniciarSessao,
        registrarBloco,
        finalizarSessao,
    }
}
