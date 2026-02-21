import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import api from '../api/client'

const QUANTIDADES = [5, 10, 15, 20, 30]
const DIFICULDADES = [
    { value: 'adaptativa', label: '🧠 Adaptativa', desc: 'Calibra conforme seu desempenho' },
    { value: 'facil', label: '🟢 Fácil', desc: 'Conceitos básicos e definições' },
    { value: 'medio', label: '🟡 Médio', desc: 'Aplicação prática e interpretação' },
    { value: 'dificil', label: '🔴 Difícil', desc: 'Pegadinhas e casos especiais' },
]
const TIPOS = [
    { value: 'multipla_escolha', label: '🔡 Múltipla', desc: '' },
    { value: 'certo_errado', label: '✅ Certo/Errado', desc: '' },
    { value: 'misto', label: '🎲 Misto', desc: '' },
]
const MODOS = [
    { value: 'concurso', label: '🏆 Simulado Completo', desc: 'Todo o edital misturado' },
    { value: 'materia', label: '📚 Por Matéria', desc: 'Foco em uma disciplina' },
    { value: 'topico', label: '🎯 Por Tópico', desc: 'Treino focado' },
    { value: 'revisao_srs', label: '🔄 Revisão SRS', desc: 'Questões pendentes de revisão' },
]

export default function QuizConfig() {
    const navigate = useNavigate()
    const toast = useToast()
    const [sp] = useSearchParams()

    const [concursos, setConcursos] = useState([])
    const [materias, setMaterias] = useState([])
    const [topicos, setTopicos] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadCon, setLoadCon] = useState(true)

    const [config, setConfig] = useState({
        modo: sp.get('modo') || (sp.get('topico_id') ? 'topico' : sp.get('materia_id') ? 'materia' : sp.get('concurso_id') ? 'concurso' : 'concurso'),
        concurso_id: sp.get('concurso_id') || '',
        materia_id: sp.get('materia_id') || '',
        topico_id: sp.get('topico_id') || '',
        quantidade: 10,
        dificuldade: 'adaptativa',
        tipo: 'multipla_escolha',
    })

    // Carrega concursos
    useEffect(() => {
        api.get('/concursos')
            .then(({ data }) => setConcursos(data.concursos))
            .finally(() => setLoadCon(false))
    }, [])

    // Carrega matérias ao trocar concurso
    useEffect(() => {
        if (!config.concurso_id) { setMaterias([]); setTopicos([]); return }
        api.get(`/concursos/${config.concurso_id}`)
            .then(({ data }) => setMaterias(data.concurso.materias))
    }, [config.concurso_id])

    // Carrega tópicos ao trocar matéria
    useEffect(() => {
        if (!config.materia_id) { setTopicos([]); return }
        const mat = materias.find(m => String(m.id) === String(config.materia_id))
        setTopicos(mat?.topicos || [])
    }, [config.materia_id, materias])

    const set = (k, v) => setConfig(p => ({ ...p, [k]: v }))

    const handleStart = async () => {
        // Validação mínima
        if (config.modo === 'concurso' && !config.concurso_id) { toast.warning('Selecione um concurso.'); return }
        if (config.modo === 'materia' && !config.materia_id) { toast.warning('Selecione uma matéria.'); return }
        if (config.modo === 'topico' && !config.topico_id) { toast.warning('Selecione um tópico.'); return }

        setLoading(true)
        try {
            const payload = {
                modo: config.modo,
                quantidade: config.quantidade,
                dificuldade: config.dificuldade,
                tipo: config.tipo,
                ...(config.modo === 'concurso' && { concurso_id: Number(config.concurso_id) }),
                ...(config.modo === 'materia' && { materia_id: Number(config.materia_id) }),
                ...(config.modo === 'topico' && { topico_id: Number(config.topico_id) }),
            }
            const { data } = await api.post('/questoes/gerar', payload)
            // Navega para o quiz passando as questões via state
            navigate('/quiz/play', { state: { questoes: data.questoes, config } })
        } catch (err) {
            if (err.response?.status === 422) {
                toast.error(Object.values(err.response.data.errors || {}).flat()[0] || 'Configuração inválida.')
            } else {
                toast.error('Erro ao gerar questões. Verifique sua chave Gemini.')
            }
        } finally {
            setLoading(false)
        }
    }

    const OptionCard = ({ options, field, cols = 2 }) => (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.625rem' }}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => set(field, opt.value)}
                    style={{
                        padding: '0.875rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        border: `1px solid ${config[field] === opt.value ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                        background: config[field] === opt.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-glass)',
                        color: config[field] === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s', textAlign: 'left',
                    }}
                >
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                </button>
            ))}
        </div>
    )

    return (
        <Layout title="Configurar Bateria">
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Modo */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-accent)' }}>🎯 Modo da Bateria</h3>
                    <OptionCard options={MODOS} field="modo" cols={2} />
                </div>

                {/* Escopo (concurso/matéria/tópico) */}
                {config.modo !== 'revisao_srs' && (
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-accent)' }}>📌 Contexto</h3>
                        {loadCon ? <Spinner /> : (
                            <>
                                {['concurso', 'materia', 'topico'].includes(config.modo) && (
                                    <div className="form-group">
                                        <label className="form-label">Concurso</label>
                                        <select className="form-input" value={config.concurso_id} onChange={e => { set('concurso_id', e.target.value); set('materia_id', ''); set('topico_id', '') }}>
                                            <option value="">Selecione…</option>
                                            {concursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                                {['materia', 'topico'].includes(config.modo) && config.concurso_id && (
                                    <div className="form-group">
                                        <label className="form-label">Matéria</label>
                                        <select className="form-input" value={config.materia_id} onChange={e => { set('materia_id', e.target.value); set('topico_id', '') }}>
                                            <option value="">Selecione…</option>
                                            {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                                {config.modo === 'topico' && config.materia_id && (
                                    <div className="form-group">
                                        <label className="form-label">Tópico</label>
                                        <select className="form-input" value={config.topico_id} onChange={e => set('topico_id', e.target.value)}>
                                            <option value="">Selecione…</option>
                                            {topicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Quantidade */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-accent)' }}>🔢 Quantidade</h3>
                    <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                        {QUANTIDADES.map(q => (
                            <button
                                key={q}
                                type="button"
                                onClick={() => set('quantidade', q)}
                                style={{
                                    padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                    border: `1px solid ${config.quantidade === q ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                                    background: config.quantidade === q ? 'rgba(99,102,241,0.12)' : 'var(--bg-glass)',
                                    color: config.quantidade === q ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s',
                                }}
                            >{q}</button>
                        ))}
                    </div>
                </div>

                {/* Dificuldade + Tipo */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-accent)' }}>⚙️ Configuração</h3>
                    <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Dificuldade</label>
                    <OptionCard options={DIFICULDADES} field="dificuldade" cols={2} />
                    <label className="form-label" style={{ margin: '1rem 0 0.5rem', display: 'block' }}>Tipo de Questão</label>
                    <OptionCard options={TIPOS} field="tipo" cols={3} />
                </div>

                {/* Botão de inicio */}
                <button
                    id="btn-iniciar-quiz"
                    className="btn btn-primary btn-lg"
                    onClick={handleStart}
                    disabled={loading}
                    style={{ boxShadow: 'var(--shadow-glow)' }}
                >
                    {loading ? <Spinner size="sm" color="#fff" /> : '⚡'}
                    {loading ? `Gerando ${config.quantidade} questões...` : `Iniciar bateria de ${config.quantidade} questões`}
                </button>
            </div>
        </Layout>
    )
}
