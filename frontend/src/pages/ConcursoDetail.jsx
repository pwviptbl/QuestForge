import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import { useConcursoFocus } from '../contexts/ConcursoFocusContext'
import api from '../api/client'

export default function ConcursoDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const { focusedConcursoId, setFocusedConcursoId, updatingFocus } = useConcursoFocus()

    const [concurso, setConcurso] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`/concursos/${id}`)
            .then(({ data }) => setConcurso(data.concurso))
            .catch(() => { toast.error('Concurso não encontrado.'); navigate('/') })
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return (
        <Layout title="Carregando...">
            <div className="flex-center" style={{ padding: '5rem' }}><Spinner size="lg" /></div>
        </Layout>
    )
    if (!concurso) return null

    const totalTopicos = concurso.materias?.reduce((acc, m) => acc + (m.topicos?.length || 0), 0) || 0
    const isFocused = focusedConcursoId === concurso.id

    const handleSetFocus = async () => {
        try {
            await setFocusedConcursoId(concurso.id)
            toast.success('Concurso definido como foco.')
        } catch {
            toast.error('Erro ao definir o concurso em foco.')
        }
    }

    return (
        <Layout title={concurso.nome}>
            {/* ─── Stats ──────────────────────────────────────── */}
            <div className="grid-3" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: '📚', label: 'Matérias', value: concurso.materias?.length || 0 },
                    { icon: '🗂️', label: 'Tópicos', value: totalTopicos },
                    { icon: '📅', label: 'Prova', value: concurso.data_prova ? new Date(concurso.data_prova).toLocaleDateString('pt-BR') : '—' },
                ].map((s, i) => (
                    <div key={i} className="stat-card">
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ─── Ações ──────────────────────────────────────── */}
            <div className="flex" style={{ gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button
                    className={isFocused ? 'btn btn-secondary' : 'btn btn-primary'}
                    onClick={handleSetFocus}
                    disabled={isFocused || updatingFocus}
                >
                    {isFocused ? '🎯 Em foco' : '🎯 Definir como foco'}
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/quiz/config?modo=concurso&concurso_id=${concurso.id}`)}
                >
                    ⚡ Iniciar bateria de questões
                </button>
                <Link to={`/concursos/${id}/editar`} className="btn btn-secondary">
                    ✏️ Editar edital
                </Link>
            </div>

            {/* ─── Árvore de Matérias/Tópicos ─────────────────── */}
            <div className="card">
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-accent)' }}>📋 Estrutura do Edital</h3>

                {concurso.materias?.length === 0 && (
                    <p className="text-muted text-center" style={{ padding: '2rem' }}>
                        Nenhuma matéria cadastrada.
                    </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {concurso.materias?.map((materia, i) => (
                        <div key={materia.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                            <div className="materia-header" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.875rem 1rem',
                                background: 'rgba(99,102,241,0.06)',
                                border: '1px solid rgba(99,102,241,0.15)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '0.5rem',
                                flexWrap: 'wrap', gap: '0.75rem'
                            }}>
                                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.1rem' }}>📚</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                        {materia.nome}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                                        {materia.topicos?.length} tópico{materia.topicos?.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => navigate(`/quiz/config?modo=materia&concurso_id=${concurso.id}&materia_id=${materia.id}`)}
                                    >
                                        ⚡ Estudar
                                    </button>
                                </div>
                            </div>

                            {/* Tópicos */}
                            <div style={{ paddingLeft: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {materia.topicos?.map(topico => (
                                    <button
                                        key={topico.id}
                                        onClick={() => navigate(`/quiz/config?modo=topico&concurso_id=${concurso.id}&materia_id=${materia.id}&topico_id=${topico.id}`)}
                                        style={{
                                            background: 'var(--bg-glass)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-full)',
                                            color: 'var(--text-secondary)',
                                            padding: '0.3rem 0.75rem',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--indigo)'
                                            e.currentTarget.style.color = 'var(--indigo-light)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border)'
                                            e.currentTarget.style.color = 'var(--text-secondary)'
                                        }}
                                    >
                                        🎯 {topico.nome}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    )
}
