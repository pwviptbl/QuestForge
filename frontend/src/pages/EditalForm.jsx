import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import api from '../api/client'

export default function EditalForm() {
    const { id } = useParams()     // presente quando editando
    const isEditing = !!id

    const [form, setForm] = useState({ nome: '', descricao: '', data_prova: '', sintaxe_original: '' })
    const [preview, setPreview] = useState(null)
    const [previewLoad, setPreviewLoad] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingData, setLoadingData] = useState(isEditing)
    const [errors, setErrors] = useState({})

    const navigate = useNavigate()
    const toast = useToast()

    // Carrega dados ao editar
    useEffect(() => {
        if (!isEditing) return
        api.get(`/concursos/${id}`)
            .then(({ data }) => {
                const c = data.concurso
                setForm({ nome: c.nome, descricao: c.descricao || '', data_prova: c.data_prova || '', sintaxe_original: c.sintaxe_original })
            })
            .catch(() => toast.error('Erro ao carregar concurso.'))
            .finally(() => setLoadingData(false))
    }, [id])

    const set = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }))
        setErrors(prev => ({ ...prev, [field]: null }))
        if (field === 'sintaxe_original') setPreview(null) // limpa preview ao alterar
    }

    // Preview da sintaxe sem salvar
    const handlePreview = async () => {
        if (!form.sintaxe_original.trim()) return
        setPreviewLoad(true)
        setPreview(null)
        try {
            const { data } = await api.post('/concursos/preview', { sintaxe_original: form.sintaxe_original })
            setPreview(data.estrutura)
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(prev => ({ ...prev, sintaxe_original: err.response.data.errors?.sintaxe_original }))
            } else {
                toast.error('Erro ao gerar preview.')
            }
        } finally {
            setPreviewLoad(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrors({})
        setLoading(true)
        try {
            if (isEditing) {
                await api.put(`/concursos/${id}`, form)
                toast.success('Concurso atualizado com sucesso!')
            } else {
                const { data } = await api.post('/concursos', form)
                toast.success('Concurso criado com sucesso! 🎉')
                navigate(`/concursos/${data.concurso.id}`)
                return
            }
            navigate(`/concursos/${id}`)
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                toast.error('Verifique os campos destacados.')
            } else {
                toast.error('Erro ao salvar concurso.')
            }
        } finally {
            setLoading(false)
        }
    }

    if (loadingData) return (
        <Layout title="Carregando...">
            <div className="flex-center" style={{ padding: '4rem' }}><Spinner size="lg" /></div>
        </Layout>
    )

    return (
        <Layout title={isEditing ? 'Editar Concurso' : 'Novo Concurso'}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-accent)' }}>📋 Informações do Concurso</h3>

                        <div className="form-group">
                            <label className="form-label">Nome do Concurso *</label>
                            <input
                                id="concurso-nome"
                                type="text"
                                className={`form-input ${errors.nome ? 'error' : ''}`}
                                placeholder="Ex: Prefeitura Municipal 2026"
                                value={form.nome}
                                onChange={set('nome')}
                                required
                            />
                            {errors.nome && <span className="form-error">⚠ {errors.nome[0]}</span>}
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Data da Prova</label>
                                <input
                                    id="concurso-data"
                                    type="date"
                                    className="form-input"
                                    value={form.data_prova}
                                    onChange={set('data_prova')}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descrição (opcional)</label>
                                <input
                                    id="concurso-descricao"
                                    type="text"
                                    className="form-input"
                                    placeholder="Cargo ou observações"
                                    value={form.descricao}
                                    onChange={set('descricao')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Parser de edital ─────────────────────────── */}
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-accent)' }}>📝 Edital (Sintaxe)</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Use o formato: <code style={{ color: 'var(--indigo-light)', background: 'rgba(99,102,241,0.1)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Materia-topico1,topico2;Materia2-topico3</code>
                        </p>

                        <div className="form-group">
                            <label className="form-label">Sintaxe do Edital *</label>
                            <textarea
                                id="concurso-sintaxe"
                                className={`form-input ${errors.sintaxe_original ? 'error' : ''}`}
                                placeholder="Portugues-interpretacao,pontuacao,concordancia;Matematica-soma,divisao,porcentagem;Informatica-windows,excel,word"
                                value={form.sintaxe_original}
                                onChange={set('sintaxe_original')}
                                style={{ minHeight: 140, fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                                required
                            />
                            {errors.sintaxe_original && <span className="form-error">⚠ {errors.sintaxe_original[0]}</span>}
                        </div>

                        <button
                            type="button"
                            id="btn-preview"
                            className="btn btn-secondary"
                            onClick={handlePreview}
                            disabled={previewLoad || !form.sintaxe_original.trim()}
                        >
                            {previewLoad ? <Spinner size="sm" /> : '👁️'}
                            {previewLoad ? 'Gerando preview...' : 'Visualizar estrutura'}
                        </button>

                        {/* Preview da estrutura */}
                        {preview && (
                            <div className="animate-fade-in" style={{ marginTop: '1.25rem', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                                <p style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600, marginBottom: '0.75rem' }}>
                                    ✅ Estrutura válida — {preview.length} matéria{preview.length !== 1 ? 's' : ''} detectada{preview.length !== 1 ? 's' : ''}
                                </p>
                                {preview.map((item, i) => (
                                    <div key={i} style={{ marginBottom: '0.625rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                                            📚 {item.materia}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingLeft: '1rem' }}>
                                            {item.topicos.map((t, j) => (
                                                <span key={j} className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex" style={{ gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                            Cancelar
                        </button>
                        <button id="btn-salvar-concurso" type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Spinner size="sm" color="#fff" /> : null}
                            {loading ? 'Salvando...' : isEditing ? '💾 Salvar alterações' : '🚀 Criar concurso'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    )
}
