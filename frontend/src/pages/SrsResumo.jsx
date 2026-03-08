import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import { useConcursoFocus } from '../contexts/ConcursoFocusContext'
import api from '../api/client'

export default function SrsResumo() {
    const [resumo, setResumo] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const toast = useToast()
    const { focusedConcurso, focusedConcursoId } = useConcursoFocus()
    const title = focusedConcurso
        ? `Revisão: ${focusedConcurso.nome}`
        : focusedConcursoId !== null
            ? 'Revisão do Concurso em Foco'
            : 'Revisão Espaçada'

    useEffect(() => {
        setLoading(true)
        api.get('/srs/resumo')
            .then(({ data }) => setResumo(data))
            .catch(() => toast.error('Erro ao carregar revisão espaçada.'))
            .finally(() => setLoading(false))
    }, [focusedConcursoId])

    if (loading) return (
        <Layout title={title}>
            <div className="flex-center" style={{ padding: '5rem' }}><Spinner size="lg" /></div>
        </Layout>
    )

    if (!resumo) return null

    const { total, dominado, pendente, vencidos, agenda_7d, por_materia } = resumo
    const dominadoPct = total > 0 ? Math.round((dominado / total) * 100) : 0

    return (
        <Layout title={title}>
            <div
                className="card"
                style={{
                    marginBottom: '1.5rem',
                    background: focusedConcurso ? 'rgba(6,182,212,0.06)' : 'var(--bg-glass)',
                    border: focusedConcurso ? '1px solid rgba(6,182,212,0.2)' : '1px solid var(--border)',
                }}
            >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                    Escopo da revisão
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {focusedConcurso
                        ? `Somente ${focusedConcurso.nome}`
                        : focusedConcursoId !== null
                            ? 'Somente o concurso em foco atual'
                            : 'Todos os concursos'}
                </div>
            </div>

            {/* ─── Stats ────────────────────────────────────────── */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: '🃏', label: 'Total de Cards', value: total, color: 'var(--indigo)' },
                    { icon: '🏆', label: 'Dominadas', value: dominado, color: 'var(--success)' },
                    { icon: '📚', label: 'Em Progressão', value: pendente, color: 'var(--warning)' },
                    { icon: '🔔', label: 'Revisão Agora', value: vencidos, color: vencidos > 0 ? 'var(--error)' : 'var(--text-muted)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Botão de revisão ──────────────────────────────── */}
            {vencidos > 0 && (
                <div className="card animate-fade-in" style={{
                    background: 'rgba(244,63,94,0.05)',
                    border: '1px solid rgba(244,63,94,0.2)',
                    marginBottom: '1.5rem',
                }}>
                    <div className="flex-between">
                        <div>
                            <h3 style={{ color: 'var(--error)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                                🔔 {vencidos} questão{vencidos !== 1 ? 'ões' : ''} aguardando revisão
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Revisar agora garante a fixação no momento ideal.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/quiz/config?modo=revisao_srs')}
                            style={{ flexShrink: 0 }}
                        >
                            🔄 Revisar agora
                        </button>
                    </div>
                </div>
            )}

            <div className="dashboard-grid-container" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* ─── Progresso geral ────────────────────────────── */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        📊 Progresso Geral
                    </h3>
                    {total === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem' }}>
                            <div className="empty-state-icon">🃏</div>
                            <p className="text-muted text-sm">Responda questões para criar cards SRS.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                <span className="text-sm text-muted">Questões dominadas</span>
                                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{dominadoPct}%</span>
                            </div>
                            <div className="progress" style={{ height: 8, marginBottom: '1.25rem' }}>
                                <div className="progress-fill" style={{ width: `${dominadoPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div className="badge badge-success">🏆 {dominado} dominadas</div>
                                <div className="badge badge-warning">📚 {pendente} em progressão</div>
                            </div>
                        </>
                    )}
                </div>

                {/* ─── Pendentes por matéria ──────────────────────── */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        📚 Pendentes por Matéria
                    </h3>
                    {por_materia.length === 0 ? (
                        <p className="text-muted text-sm">Nenhuma pendência por matéria.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {por_materia.map((m, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>📚 {m.materia}</span>
                                    <span className="badge badge-warning">{m.pendentes}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Agenda dos próximos 7 dias ────────────────────── */}
            {agenda_7d.length > 0 && (
                <div className="card animate-fade-in">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        📅 Agenda — Próximos 7 dias
                    </h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {agenda_7d.map((d, i) => (
                            <div key={i} style={{
                                background: 'var(--bg-glass)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
                                textAlign: 'center', minWidth: 80,
                            }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                </div>
                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--indigo-light)' }}>
                                    {d.quantidade}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>questões</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    )
}
