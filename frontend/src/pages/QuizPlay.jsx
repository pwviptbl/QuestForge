import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import { usePomodoro } from '../hooks/usePomodoro'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'

export default function QuizPlay() {
    const location = useLocation()
    const navigate = useNavigate()
    const toast = useToast()
    const { user } = useAuth()

    const questoes = location.state?.questoes || []
    const modo = location.state?.config?.modo || null
    const pomodoro = usePomodoro(user?.pomodoro_duracao || 25)

    const [idx, setIdx] = useState(0)         // questão atual
    const [selecionada, setSelecionada] = useState(null)      // resposta escolhida
    const [eliminadas, setEliminadas] = useState([])           // alternativas descartadas durante a resolução
    const [confirmada, setConfirmada] = useState(false)     // respondeu?
    const [explicacao, setExplicacao] = useState(null)      // texto da explicação
    const [loadExpl, setLoadExpl] = useState(false)     // carregando explicação
    const [responseId, setResponseId] = useState(null)      // ID da resposta salva
    const [resultados, setResultados] = useState([])        // histórico da sessão
    const [finalizado, setFinalizado] = useState(false)
    const [saving, setSaving] = useState(false)
    const [audioCarregando, setAudioCarregando] = useState(null)
    const [audioTocando, setAudioTocando] = useState(null)
    const inicioRef = useRef(Date.now())                      // timestamp de início da questão
    const audioRef = useRef(null)

    // Redireciona se não há questões (acesso direto à URL)
    useEffect(() => {
        if (questoes.length === 0) {
            toast.warning('Nenhuma questão disponível. Configure a bateria primeiro.')
            navigate('/quiz/config')
        }
    }, [])

    useEffect(() => () => {
        if (audioRef.current) {
            audioRef.current.pause()
            URL.revokeObjectURL(audioRef.current.src)
        }
    }, [])

    if (questoes.length === 0) return null

    const questao = questoes[idx]
    const acertou = confirmada && selecionada?.toUpperCase() === questao.resposta_correta?.toUpperCase()

    // ─── Confirmar resposta ──────────────────────────────────────
    const confirmar = async () => {
        if (!selecionada || confirmada) return
        setSaving(true)
        setConfirmada(true)
        const tempo = Math.round((Date.now() - inicioRef.current) / 1000)
        const isAcerto = selecionada.toUpperCase() === questao.resposta_correta?.toUpperCase()

        try {
            const { data } = await api.post('/respostas', {
                questao_id: questao.id,
                resposta_usuario: selecionada,
                tempo_resposta_seg: tempo,
                modo: modo,
            })
            setResponseId(data.response_id)
            setResultados(prev => [...prev, { questao_id: questao.id, acertou: isAcerto }])
        } catch {
            toast.error('Erro ao salvar resposta.')
        } finally {
            setSaving(false)
        }
    }

    // ─── Solicitar explicação ────────────────────────────────────
    const pedirExplicacao = async () => {
        if (loadExpl || explicacao) return
        setLoadExpl(true)
        try {
            const { data } = await api.post(`/questoes/${questao.id}/explicacao`, {
                resposta_usuario: selecionada,
                response_id: responseId,
            })
            setExplicacao(data.explicacao)
        } catch {
            toast.error('Erro ao gerar explicação.')
        } finally {
            setLoadExpl(false)
        }
    }

    // ─── Próxima questão ─────────────────────────────────────────
    const avancar = () => {
        if (idx + 1 >= questoes.length) {
            setFinalizado(true)
            return
        }
        setIdx(prev => prev + 1)
        pararAudio()
        setSelecionada(null)
        setEliminadas([])
        setConfirmada(false)
        setExplicacao(null)
        setResponseId(null)
        inicioRef.current = Date.now()
    }

    const pararAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            URL.revokeObjectURL(audioRef.current.src)
            audioRef.current = null
        }
        setAudioTocando(null)
    }

    const ouvir = async (texto, chave) => {
        if (audioTocando === chave) {
            pararAudio()
            return
        }

        pararAudio()
        setAudioCarregando(chave)

        try {
            const { data } = await api.post('/tts', { text: texto }, { responseType: 'blob' })
            const url = URL.createObjectURL(data)
            const audio = new Audio(url)
            audioRef.current = audio
            audio.onended = () => {
                URL.revokeObjectURL(url)
                if (audioRef.current === audio) audioRef.current = null
                setAudioTocando(null)
            }
            audio.onerror = () => {
                URL.revokeObjectURL(url)
                if (audioRef.current === audio) audioRef.current = null
                setAudioTocando(null)
                toast.error('Não foi possível reproduzir o áudio.')
            }
            await audio.play()
            setAudioTocando(chave)
        } catch {
            toast.error('Não foi possível gerar o áudio agora.')
        } finally {
            setAudioCarregando(null)
        }
    }

    // Primeiro clique seleciona. Ao clicar novamente na alternativa selecionada,
    // ela é descartada; um novo clique apenas restaura a alternativa.
    const escolherAlternativa = (opcao) => {
        if (confirmada) return

        if (selecionada === opcao) {
            setSelecionada(null)
            setEliminadas(prev => prev.includes(opcao) ? prev : [...prev, opcao])
            return
        }

        if (eliminadas.includes(opcao)) {
            setEliminadas(prev => prev.filter(item => item !== opcao))
            return
        }

        setSelecionada(opcao)
    }

    // ─── Tela de resultados ──────────────────────────────────────
    if (finalizado) {
        const acertos = resultados.filter(r => r.acertou).length
        const pct = Math.round((acertos / questoes.length) * 100)
        const cor = pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)'

        return (
            <div style={{
                minHeight: '100vh', background: 'var(--bg-primary)', backgroundImage: 'var(--gradient-hero)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
            }}>
                <div className="card animate-scale-in" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                        {pct >= 70 ? '🏆' : pct >= 50 ? '📈' : '💪'}
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Bateria concluída!</h2>

                    <div style={{
                        fontSize: '4rem', fontFamily: 'var(--font-heading)', fontWeight: 800,
                        color: cor, margin: '1rem 0',
                    }}>{pct}%</div>

                    <p style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        {acertos} de {questoes.length} questões corretas
                    </p>

                    {/* Progress circular visual */}
                    <div className="progress" style={{ margin: '1rem 0 1.5rem' }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: cor === 'var(--success)' ? 'var(--gradient-brand)' : cor }} />
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        {pct >= 70
                            ? 'Excelente desempenho! Continue assim! 🚀'
                            : pct >= 50
                                ? 'Bom progresso! Revise os tópicos com mais erros.'
                                : 'Você pode melhorar! O sistema de revisão já foi atualizado.'}
                    </p>

                    <div className="flex" style={{ gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/quiz/config')}>
                            ⚡ Nova bateria
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/')}>
                            🏠 Início
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                            📊 Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ─── Tela de quiz ────────────────────────────────────────────
    const progress = ((idx) / questoes.length) * 100

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            backgroundImage: 'var(--gradient-hero)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header com progresso e Pomodoro */}
            <header style={{
                padding: '1rem 2rem',
                background: 'rgba(13,18,36,0.9)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
            }}>
                {/* Progresso */}
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="flex-between" style={{ marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            QUESTÃO {idx + 1} / {questoes.length}
                        </span>
                        <span className={`badge ${acertou && confirmada ? 'badge-success' : !selecionada || !confirmada ? 'badge-indigo' : 'badge-error'}`}>
                            {questao.dificuldade}
                        </span>
                    </div>
                    <div className="progress">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Pomodoro Timer */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: 'var(--bg-glass)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem',
                }}>
                    <span style={{ fontSize: '1rem' }}>🍅</span>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700,
                        color: pomodoro.fase === 'foco' ? 'var(--text-primary)' : 'var(--success)',
                    }}>
                        {pomodoro.tempoFormatado}
                    </span>
                    <button
                        onClick={pomodoro.ativo ? pomodoro.pausar : pomodoro.iniciar}
                        style={{
                            background: pomodoro.ativo && !pomodoro.isPausa ? 'rgba(99,102,241,0.15)' : 'var(--bg-glass)',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem 0.5rem',
                            fontSize: '0.8rem',
                        }}
                    >
                        {!pomodoro.ativo ? '▶' : pomodoro.isPausa ? '▶' : '⏸'}
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        🍅 {pomodoro.blocosCompletos}
                    </span>
                </div>
            </header>

            {/* Questão */}
            <div style={{ flex: 1, padding: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 720 }} className="animate-fade-in">
                    {/* Enunciado */}
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                            <BotaoAudio
                                onClick={() => ouvir(questao.enunciado, 'enunciado')}
                                carregando={audioCarregando === 'enunciado'}
                                tocando={audioTocando === 'enunciado'}
                                label="Ouvir enunciado"
                            />
                        </div>
                        <p style={{
                            fontSize: '1.05rem',
                            lineHeight: 1.8,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-body)',
                        }}>
                            {questao.enunciado}
                        </p>
                    </div>

                    {/* Alternativas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                        {!confirmada && (
                            <p style={{ margin: '0 0 0.15rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Clique para selecionar. Clique novamente na selecionada para eliminá-la.
                            </p>
                        )}
                        {questao.tipo === 'certo_errado' ? (
                            ['CERTO', 'ERRADO'].map(opt => (
                                <AlternativaBtn
                                    key={opt}
                                    letra={opt === 'CERTO' ? '✅' : '❌'}
                                    texto={opt}
                                    selecionada={selecionada}
                                    eliminada={eliminadas.includes(opt)}
                                    confirmada={confirmada}
                                    correta={questao.resposta_correta}
                                    onClick={() => escolherAlternativa(opt)}
                                    isOpt={opt}
                                    onOuvir={() => ouvir(opt, `alternativa-${opt}`)}
                                    audioCarregando={audioCarregando === `alternativa-${opt}`}
                                    audioTocando={audioTocando === `alternativa-${opt}`}
                                />
                            ))
                        ) : (
                            questao.alternativas?.map(alt => (
                                <AlternativaBtn
                                    key={alt.letra}
                                    letra={alt.letra}
                                    texto={alt.texto}
                                    selecionada={selecionada}
                                    eliminada={eliminadas.includes(alt.letra)}
                                    confirmada={confirmada}
                                    correta={questao.resposta_correta}
                                    onClick={() => escolherAlternativa(alt.letra)}
                                    isOpt={alt.letra}
                                    onOuvir={() => ouvir(`Alternativa ${alt.letra}. ${alt.texto}`, `alternativa-${alt.letra}`)}
                                    audioCarregando={audioCarregando === `alternativa-${alt.letra}`}
                                    audioTocando={audioTocando === `alternativa-${alt.letra}`}
                                />
                            ))
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                        {!confirmada ? (
                            <button
                                id="btn-confirmar"
                                className="btn btn-primary"
                                onClick={confirmar}
                                disabled={!selecionada || saving}
                                style={{ flex: 1 }}
                            >
                                {saving ? <Spinner size="sm" color="#fff" /> : null}
                                {saving ? 'Salvando...' : '✓ Confirmar resposta'}
                            </button>
                        ) : (
                            <>
                                <button
                                    className="btn btn-secondary"
                                    onClick={pedirExplicacao}
                                    disabled={loadExpl || !!explicacao}
                                    style={{ flex: 1 }}
                                >
                                    {loadExpl ? <Spinner size="sm" /> : '💡'}
                                    {loadExpl ? 'Gerando explicação...' : explicacao ? 'Explicação exibida' : 'Ver explicação'}
                                </button>
                                <button
                                    id="btn-proxima"
                                    className="btn btn-primary"
                                    onClick={avancar}
                                    style={{ flex: 1 }}
                                >
                                    {idx + 1 >= questoes.length ? '🏁 Finalizar' : 'Próxima →'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Explicação */}
                    {explicacao && (
                        <div className="animate-fade-in" style={{
                            marginTop: '1.25rem',
                            background: 'rgba(6,182,212,0.05)',
                            border: '1px solid rgba(6,182,212,0.2)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <span>💡</span>
                                <span style={{ fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>
                                    Explicação da IA
                                </span>
                                <BotaoAudio
                                    onClick={() => ouvir(explicacao, 'explicacao')}
                                    carregando={audioCarregando === 'explicacao'}
                                    tocando={audioTocando === 'explicacao'}
                                    label="Ouvir explicação"
                                />
                            </div>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                {explicacao}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ─── Componente de alternativa ─────────────────────────────── */
function AlternativaBtn({ letra, texto, selecionada, eliminada, confirmada, correta, onClick, isOpt, onOuvir, audioCarregando, audioTocando }) {
    const isSel = selecionada === isOpt
    const isCorr = correta === isOpt

    let bg = 'var(--bg-glass)'
    let border = 'var(--border)'
    let color = 'var(--text-secondary)'

    if (!confirmada && isSel) {
        bg = 'rgba(99,102,241,0.1)'; border = 'rgba(99,102,241,0.4)'; color = 'var(--text-primary)'
    }
    if (!confirmada && eliminada) {
        bg = 'rgba(148,163,184,0.06)'; border = 'rgba(148,163,184,0.22)'; color = 'var(--text-muted)'
    }
    if (confirmada && isCorr) {
        bg = 'var(--success-bg)'; border = 'rgba(16,185,129,0.4)'; color = 'var(--success)'
    }
    if (confirmada && isSel && !isCorr) {
        bg = 'var(--error-bg)'; border = 'rgba(244,63,94,0.4)'; color = 'var(--error)'
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={onClick}
                disabled={confirmada}
                style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: !confirmada ? '0.875rem 3.5rem 0.875rem 1rem' : '0.875rem 1rem', borderRadius: 'var(--radius-md)',
                background: bg, border: `1px solid ${border}`, cursor: confirmada ? 'default' : 'pointer',
                transition: 'all 0.2s', textAlign: 'left', width: '100%',
                opacity: !confirmada && eliminada ? 0.7 : 1,
                }}
            >
                <span style={{
                    minWidth: 28, height: 28, borderRadius: '50%',
                    background: confirmada && isCorr ? 'var(--success)' : 'var(--bg-secondary)',
                    border: `2px solid ${border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8rem', color: confirmada && isCorr ? '#fff' : color,
                    flexShrink: 0,
                }}>
                    {confirmada && isCorr ? '✓' : letra}
                </span>
                <span style={{
                    color, fontSize: '0.9rem', lineHeight: 1.6, flex: 1,
                    textDecoration: !confirmada && eliminada ? 'line-through' : 'none',
                }}>{texto}</span>
            </button>
            {!confirmada && (
                <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <BotaoAudio
                        onClick={onOuvir}
                        carregando={audioCarregando}
                        tocando={audioTocando}
                        label={`Ouvir alternativa ${letra}`}
                    />
                </div>
            )}
        </div>
    )
}

function BotaoAudio({ onClick, carregando, tocando, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={carregando}
            aria-label={label}
            title={label}
            style={{
                border: '1px solid var(--border)', borderRadius: '50%', width: 30, height: 30,
                background: tocando ? 'rgba(99,102,241,0.18)' : 'var(--bg-secondary)',
                color: 'var(--text-secondary)', cursor: carregando ? 'wait' : 'pointer', flexShrink: 0,
            }}
        >
            {carregando ? '…' : tocando ? '⏹' : '🔊'}
        </button>
    )
}
