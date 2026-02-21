import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useToast } from '../components/Toast'
import api from '../api/client'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'

const CORES = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#84cc16']

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        api.get('/dashboard/stats')
            .then(({ data }) => setStats(data))
            .catch(() => {
                toast.error('Erro ao carregar dashboard.')
                setStats(mockStats)  // fallback para mock em caso de erro
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <Layout title="Dashboard">
            <div className="flex-center" style={{ padding: '5rem' }}><Spinner size="lg" /></div>
        </Layout>
    )

    const { geral, porMateria, evolucao, vulnerabilidades, srs, pomodoro } = stats

    return (
        <Layout title="Dashboard de Desempenho">
            {/* ─── Stats gerais ────────────────────────────────── */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
                {[
                    { icon: '📝', label: 'Total respondidas', value: geral.total, color: 'var(--indigo)' },
                    { icon: '✅', label: 'Taxa de acerto', value: `${geral.taxaAcerto}%`, color: 'var(--success)' },
                    { icon: '🔥', label: 'Dias seguidos', value: `${geral.sequencia}d`, color: 'var(--warning)' },
                    { icon: '📅', label: 'Hoje', value: geral.hoje, color: 'var(--cyan)' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* ─── Evolução semanal ─────────────────────────── */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        📈 Taxa de Acerto — 7 dias
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={evolucao}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                            <Tooltip
                                contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                labelStyle={{ color: '#94a3b8' }}
                                formatter={(v) => [`${v}%`, 'Acerto']}
                            />
                            <Line
                                type="monotone" dataKey="acerto" stroke="#6366f1" strokeWidth={2.5}
                                dot={{ fill: '#6366f1', r: 4 }}
                                activeDot={{ r: 6, fill: '#818cf8' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* ─── Distribuição por matéria ──────────────────── */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        🎯 Questões por Matéria
                    </h3>
                    {porMateria.length === 0 ? (
                        <div className="flex-center" style={{ height: 200 }}>
                            <p className="text-muted text-sm">Responda questões para ver os dados</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={porMateria} dataKey="total" nameKey="materia"
                                    cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                                    label={({ materia, percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                                    labelLine={false} fontSize={11}
                                >
                                    {porMateria.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                    formatter={(v, n, p) => [`${v} questões (${p.payload.taxa_acerto}% acerto)`, p.payload.materia]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* ─── Vulnerabilidades ──────────────────────────── */}
                <div className="card">
                    <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-accent)' }}>🔴 Taxa de Erro por Matéria</h3>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/vulnerabilidades')}>
                            Ver detalhes
                        </button>
                    </div>
                    {vulnerabilidades.length === 0 ? (
                        <div className="flex-center" style={{ height: 180 }}>
                            <p className="text-muted text-sm">Dados disponíveis após 5+ respostas por matéria</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={vulnerabilidades} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                                <YAxis dataKey="materia" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
                                <Tooltip
                                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                    formatter={(v) => [`${v}%`, 'Taxa de erro']}
                                />
                                <Bar dataKey="erros_pct" name="Erro %" radius={[0, 5, 5, 0]}>
                                    {vulnerabilidades.map((e, i) => (
                                        <Cell key={i} fill={e.erros_pct > 60 ? '#f43f5e' : e.erros_pct > 40 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* ─── SRS + Pomodoro ────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Card SRS */}
                    <div className="card" style={{
                        background: srs.pendentes > 0 ? 'rgba(6,182,212,0.05)' : undefined,
                        border: srs.pendentes > 0 ? '1px solid rgba(6,182,212,0.2)' : undefined,
                        flex: 1,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🔄</span>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--cyan)' }}>Revisão Espaçada</h3>
                        </div>
                        <div className="stat-value" style={{ color: srs.pendentes > 0 ? 'var(--cyan)' : 'var(--text-muted)', fontSize: '2rem', marginBottom: '0.25rem' }}>
                            {srs.pendentes}
                        </div>
                        <p className="text-sm text-muted" style={{ marginBottom: '0.875rem' }}>
                            {srs.pendentes === 1 ? 'questão pendente' : 'questões pendentes'}
                        </p>
                        {srs.pendentes > 0 && (
                            <button
                                className="btn btn-primary btn-sm btn-full"
                                onClick={() => navigate('/quiz/config?modo=revisao_srs')}
                            >
                                🔄 Revisar agora
                            </button>
                        )}
                    </div>

                    {/* Card Pomodoro */}
                    <div className="card" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>🍅</span>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-accent)' }}>Pomodoro — 30 dias</h3>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                                    {pomodoro.total_blocos}
                                </div>
                                <div className="stat-label">blocos</div>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                                    {pomodoro.total_sessoes}
                                </div>
                                <div className="stat-label">sessões</div>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                                    {pomodoro.total_questoes}
                                </div>
                                <div className="stat-label">questões</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Detalhamento por matéria ──────────────────────── */}
            {porMateria.length > 0 && (
                <div className="card animate-fade-in">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-accent)' }}>
                        📊 Desempenho Detalhado por Matéria
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {porMateria.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: 120, fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {m.materia}
                                </div>
                                <div className="progress" style={{ flex: 1 }}>
                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${m.taxa_acerto}%`,
                                            background: m.taxa_acerto >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' :
                                                m.taxa_acerto >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                                                    'linear-gradient(90deg,#f43f5e,#fb7185)',
                                        }}
                                    />
                                </div>
                                <div style={{ width: 80, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }}>
                                    <span style={{
                                        color: m.taxa_acerto >= 70 ? 'var(--success)' : m.taxa_acerto >= 50 ? 'var(--warning)' : 'var(--error)'
                                    }}>
                                        {m.taxa_acerto}%
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.375rem', fontSize: '0.75rem' }}>
                                        ({m.total})
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Layout>
    )
}

/* ─── Fallback mock (quando a API ainda não tem dados) ────────── */
const mockStats = {
    geral: { total: 0, acertos: 0, taxaAcerto: 0, sequencia: 0, hoje: 0 },
    srs: { pendentes: 0, por_materia: [] },
    porMateria: [],
    evolucao: Array.from({ length: 7 }, (_, i) => ({
        dia: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i],
        acerto: 0, total: 0,
    })),
    vulnerabilidades: [],
    pomodoro: { total_sessoes: 0, total_blocos: 0, total_questoes: 0 },
}
