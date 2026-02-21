import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const toast = useToast()

    const from = location.state?.from?.pathname || '/'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrors({})
        setLoading(true)
        try {
            await login(email, password)
            toast.success('Bem-vindo de volta! 🎯')
            navigate(from, { replace: true })
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
            } else if (err.response?.status === 401) {
                setErrors({ email: ['Credenciais inválidas. Verifique e-mail e senha.'] })
            } else {
                toast.error('Erro ao conectar com o servidor.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'var(--bg-primary)',
            backgroundImage: 'var(--gradient-hero)',
        }}>
            {/* ─── Painel esquerdo (hero) ──────────────────────── */}
            <div style={{
                flex: 1,
                display: 'none',
                background: 'linear-gradient(145deg, #0d1224 0%, #111827 100%)',
                borderRight: '1px solid var(--border)',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '4rem',
                position: 'relative',
                overflow: 'hidden',
            }} className="hero-panel">
                {/* Orbs decorativos */}
                <div style={{ position: 'absolute', top: '10%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--gradient-brand)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', boxShadow: 'var(--shadow-glow)' }}>🎯</div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>QuestForge</span>
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', marginBottom: '1rem', lineHeight: 1.2 }}>
                        Estude com<br />
                        <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inteligência Artificial</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 420 }}>
                        Questões personalizadas, revisão espaçada automática e análise de vulnerabilidades para concurseiros que querem resultados reais.
                    </p>

                    {[
                        { icon: '⚡', text: 'Questões geradas por IA em segundos' },
                        { icon: '🧠', text: 'Sistema de revisão espaçada (SM-2)' },
                        { icon: '📊', text: 'Dashboard de vulnerabilidades' },
                        { icon: '🍅', text: 'Modo Pomodoro integrado' },
                    ].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem' }}>
                            <div style={{ width: 36, height: 36, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{f.icon}</div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Painel direito (form) ────────────────────────── */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}>
                <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade-in">
                    {/* Mobile logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'var(--gradient-brand)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'var(--shadow-glow)' }}>🎯</div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>QuestForge</span>
                    </div>

                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Entrar na conta</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                        Não tem conta? <Link to="/register" style={{ color: 'var(--indigo-light)', fontWeight: 600 }}>Cadastre-se grátis</Link>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input
                                id="login-email"
                                type="email"
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="seu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                            {errors.email && <span className="form-error">⚠ {errors.email[0]}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Senha</label>
                            <input
                                id="login-password"
                                type="password"
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            {errors.password && <span className="form-error">⚠ {errors.password[0]}</span>}
                        </div>

                        <button
                            id="btn-login"
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                            style={{ marginTop: '0.5rem' }}
                        >
                            {loading ? <Spinner size="sm" color="#fff" /> : null}
                            {loading ? 'Entrando...' : '🚀 Entrar'}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`.hero-panel { @media (min-width: 900px) { display: flex !important; } }`}</style>
        </div>
    )
}
