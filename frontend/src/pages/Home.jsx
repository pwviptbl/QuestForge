import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useConcursoFocus } from '../contexts/ConcursoFocusContext'
import api from '../api/client'

export default function Home() {
    const [deleting, setDeleting] = useState(null)
    const [modalDel, setModalDel] = useState(null)
    const {
        concursos,
        concursosLoading,
        concursosLoaded,
        concursoError,
        refreshConcursos,
        focusedConcursoId,
        setFocusedConcursoId,
        updatingFocus,
    } = useConcursoFocus()
    const navigate = useNavigate()
    const toast = useToast()

    const handleDelete = async () => {
        if (!modalDel) return
        setDeleting(modalDel.id)
        try {
            await api.delete(`/concursos/${modalDel.id}`)
            if (focusedConcursoId === modalDel.id) {
                await setFocusedConcursoId(null)
            }
            await refreshConcursos()
            toast.success('Concurso excluído.')
        } catch {
            toast.error('Erro ao excluir concurso.')
        } finally {
            setDeleting(null)
            setModalDel(null)
        }
    }

    const handleSetFocus = async (event, concursoId) => {
        event.stopPropagation()

        try {
            await setFocusedConcursoId(concursoId)
            toast.success('Concurso definido como foco.')
        } catch {
            toast.error('Erro ao definir o concurso em foco.')
        }
    }

    return (
        <Layout title="Meus Concursos">
            {/* Header de ação */}
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {concursos.length} concurso{concursos.length !== 1 ? 's' : ''} cadastrado{concursos.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Link to="/concursos/novo" className="btn btn-primary">
                    ➕ Novo Concurso
                </Link>
            </div>

            {/* Loading */}
            {concursosLoading && !concursosLoaded && (
                <div className="flex-center" style={{ padding: '4rem' }}>
                    <Spinner size="lg" />
                </div>
            )}

            {concursoError && (
                <div className="empty-state animate-fade-in">
                    <div className="empty-state-icon">⚠️</div>
                    <h3>Erro ao carregar concursos</h3>
                    <p style={{ maxWidth: 350 }}>
                        Não foi possível buscar seus concursos agora.
                    </p>
                    <button className="btn btn-primary" onClick={() => refreshConcursos().catch(() => {})}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!concursosLoading && !concursoError && concursos.length === 0 && (
                <div className="empty-state animate-fade-in">
                    <div className="empty-state-icon">📚</div>
                    <h3>Nenhum concurso cadastrado</h3>
                    <p style={{ maxWidth: 350 }}>
                        Comece cadastrando o edital do seu concurso e deixe a IA gerar questões personalizadas para você.
                    </p>
                    <Link to="/concursos/novo" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                        ➕ Cadastrar primeiro concurso
                    </Link>
                </div>
            )}

            {/* Lista de concursos */}
            {!concursosLoading && !concursoError && concursos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {concursos.map((c, i) => {
                        const isFocused = focusedConcursoId === c.id

                        return (
                        <div
                            key={c.id}
                            className="card animate-fade-in"
                            style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }}
                            onClick={() => navigate(`/concursos/${c.id}`)}
                        >
                            {/* Badge de matérias */}
                            <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span className="badge badge-indigo">
                                        📚 {c.materias_count} matéria{c.materias_count !== 1 ? 's' : ''}
                                    </span>
                                    {isFocused && (
                                        <span className="badge badge-success">
                                            🎯 Em foco
                                        </span>
                                    )}
                                </div>
                                {c.data_prova && (
                                    <span className="badge badge-warning">
                                        📅 {new Date(c.data_prova).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>

                            {/* Nome */}
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                {c.nome}
                            </h3>

                            {/* Matérias */}
                            {c.materias?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
                                    {c.materias.slice(0, 4).map(m => (
                                        <span key={m.id} style={{
                                            fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                                            background: 'var(--bg-glass)', border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-full)', color: 'var(--text-muted)',
                                        }}>
                                            {m.nome}
                                        </span>
                                    ))}
                                    {c.materias.length > 4 && (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                            +{c.materias.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Ações */}
                            <div className="flex" style={{ gap: '0.5rem', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                                <button
                                    className={isFocused ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                                    onClick={(event) => handleSetFocus(event, c.id)}
                                    disabled={isFocused || updatingFocus}
                                >
                                    {isFocused ? '🎯 Em foco' : '🎯 Foco'}
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1 }}
                                    onClick={() => navigate(`/quiz/config?concurso_id=${c.id}`)}
                                >
                                    ⚡ Iniciar bateria
                                </button>
                                <Link
                                    to={`/concursos/${c.id}`}
                                    className="btn btn-secondary btn-sm"
                                >
                                    👁️
                                </Link>
                                <Link
                                    to={`/concursos/${c.id}/editar`}
                                    className="btn btn-secondary btn-sm"
                                >
                                    ✏️
                                </Link>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => setModalDel(c)}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                        )
                    })}
                </div>
            )}

            {/* Modal de confirmação de exclusão */}
            <Modal
                open={!!modalDel}
                onClose={() => setModalDel(null)}
                title="Excluir concurso"
                size="sm"
            >
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                    Tem certeza que deseja excluir o concurso <strong style={{ color: 'var(--text-primary)' }}>{modalDel?.nome}</strong>?
                    Todas as matérias, tópicos e questões serão removidas permanentemente.
                </p>
                <div className="flex" style={{ gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setModalDel(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={!!deleting}>
                        {deleting ? <Spinner size="sm" color="var(--error)" /> : null}
                        Excluir
                    </button>
                </div>
            </Modal>
        </Layout>
    )
}
