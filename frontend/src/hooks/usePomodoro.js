import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook do timer Pomodoro.
 * Gerencia o estado do timer, pausas e blocos completados.
 */
export function usePomodoro(duracaoMin = 25) {
    const [segundosRestantes, setSegundosRestantes] = useState(duracaoMin * 60)
    const [ativo, setAtivo] = useState(false)
    const [isPausa, setIsPausa] = useState(false)
    const [blocosCompletos, setBlocosCompletos] = useState(0)
    const [fase, setFase] = useState('foco')  // 'foco' | 'pausa_curta' | 'pausa_longa'
    const intervalRef = useRef(null)

    // Duração de cada fase em segundos
    const duracoes = {
        foco: duracaoMin * 60,
        pausa_curta: 5 * 60,
        pausa_longa: 15 * 60,
    }

    const progressoPct = ((duracoes[fase] - segundosRestantes) / duracoes[fase]) * 100

    // ─── Tick do timer ────────────────────────────────────────────
    useEffect(() => {
        if (!ativo || isPausa) {
            clearInterval(intervalRef.current)
            return
        }

        intervalRef.current = setInterval(() => {
            setSegundosRestantes(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current)
                    proximaFase()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(intervalRef.current)
    }, [ativo, isPausa, fase])

    // ─── Avança para próxima fase ─────────────────────────────────
    const proximaFase = useCallback(() => {
        if (fase === 'foco') {
            const novosBlockos = blocosCompletos + 1
            setBlocosCompletos(novosBlockos)

            // A cada 4 blocos de foco: pausa longa
            const novaFase = novosBlockos % 4 === 0 ? 'pausa_longa' : 'pausa_curta'
            setFase(novaFase)
            setSegundosRestantes(duracoes[novaFase])
            setAtivo(true)
            setIsPausa(false)

            // Notificação do navegador
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🎯 Pomodoro concluído!', {
                    body: novaFase === 'pausa_longa' ? 'Pausa longa de 15 min!' : 'Pausa curta de 5 min!',
                })
            }
        } else {
            // Pausa terminou → volta para foco
            setFase('foco')
            setSegundosRestantes(duracoes.foco)
            setAtivo(false) // aguarda o usuário iniciar o próximo bloco
        }
    }, [fase, blocosCompletos, duracoes])

    // ─── Controles ────────────────────────────────────────────────
    const iniciar = useCallback(() => { setAtivo(true); setIsPausa(false) }, [])
    const pausar = useCallback(() => setIsPausa(p => !p), [])
    const resetar = useCallback(() => {
        clearInterval(intervalRef.current)
        setAtivo(false)
        setIsPausa(false)
        setFase('foco')
        setSegundosRestantes(duracaoMin * 60)
    }, [duracaoMin])

    // Formata MM:SS
    const tempoFormatado = `${String(Math.floor(segundosRestantes / 60)).padStart(2, '0')}:${String(segundosRestantes % 60).padStart(2, '0')}`

    return {
        tempoFormatado,
        segundosRestantes,
        progressoPct,
        ativo,
        isPausa,
        fase,
        blocosCompletos,
        iniciar,
        pausar,
        resetar,
    }
}
