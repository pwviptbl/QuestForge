import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [showPw, setShowPw] = useState(false)
    const [showPwConfirm, setShowPwConfirm] = useState(false)

    const { register } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrors({})
        setLoading(true)
        try {
            await register(form.name, form.email, form.password, form.password_confirmation)
            // Navega para login com flag de aprovação pendente (não depende de toast)
            navigate('/login', { state: { pendingApproval: true } })
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
            } else {
                toast.error('Erro ao criar conta. Tente novamente.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            backgroundImage: 'var(--gradient-hero)',
            padding: '2rem',
        }}>
            <div style={{ width: '100%', maxWidth: 460 }} className="animate-fade-in">
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
                    <div style={{ width: 40, height: 40, background: 'var(--gradient-brand)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: 'var(--shadow-glow)' }}>🎯</div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800 }}>QuestForge</span>
                </div>

                <div className="card">
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>Criar conta gratuita</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                        Já tem conta? <Link to="/login" style={{ color: 'var(--indigo-light)', fontWeight: 600 }}>Entrar</Link>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Nome completo</label>
                            <input
                                id="register-name"
                                type="text"
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Seu nome"
                                value={form.name}
                                onChange={set('name')}
                                required autoFocus
                            />
                            {errors.name && <span className="form-error">⚠ {errors.name[0]}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">E-mail</label>
                            <input
                                id="register-email"
                                type="email"
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="seu@email.com"
                                value={form.email}
                                onChange={set('email')}
                                required
                            />
                            {errors.email && <span className="form-error">⚠ {errors.email[0]}</span>}
                        </div>

                        <div className="grid-2" style={{ gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Senha</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="register-password"
                                        type={showPw ? 'text' : 'password'}
                                        className={`form-input ${errors.password ? 'error' : ''}`}
                                        placeholder="mín. 8 caracteres"
                                        value={form.password}
                                        onChange={set('password')}
                                        required
                                        style={{ paddingRight: '2.75rem' }}
                                    />
                                    <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }} title={showPw ? 'Ocultar' : 'Mostrar'}>
                                        {showPw ? '🙈' : '👁'}
                                    </button>
                                </div>
                                {errors.password && <span className="form-error">⚠ {errors.password[0]}</span>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Confirmar senha</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="register-password-confirm"
                                        type={showPwConfirm ? 'text' : 'password'}
                                        className={`form-input ${errors.password_confirmation ? 'error' : ''}`}
                                        placeholder="••••••••"
                                        value={form.password_confirmation}
                                        onChange={set('password_confirmation')}
                                        required
                                        style={{ paddingRight: '2.75rem' }}
                                    />
                                    <button type="button" onClick={() => setShowPwConfirm(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }} title={showPwConfirm ? 'Ocultar' : 'Mostrar'}>
                                        {showPwConfirm ? '🙈' : '👁'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            id="btn-register"
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                            style={{ marginTop: '1.5rem' }}
                        >
                            {loading ? <Spinner size="sm" color="#fff" /> : null}
                            {loading ? 'Criando conta...' : '🎯 Criar conta'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
