import { useState } from 'react'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import api from '../api/client'

export default function Profile() {
    const { user, updateProfile } = useAuth()
    const toast = useToast()

    // ─── Seção: Dados do perfil ───────────────────────────────────
    const [nameForm, setNameForm] = useState({ name: user?.name || '' })
    const [nameLoading, setNameLoading] = useState(false)
    const [nameErrors, setNameErrors] = useState({})

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setNameErrors({})
        setNameLoading(true)
        try {
            await updateProfile({ name: nameForm.name })
            toast.success('Nome atualizado com sucesso! ✅')
        } catch (err) {
            if (err.response?.status === 422) {
                setNameErrors(err.response.data.errors || {})
            } else {
                toast.error('Erro ao atualizar o perfil.')
            }
        } finally {
            setNameLoading(false)
        }
    }

    // ─── Seção: Alteração de senha ────────────────────────────────
    const [pwForm, setPwForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    })
    const [pwLoading, setPwLoading] = useState(false)
    const [pwErrors, setPwErrors] = useState({})
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
    const togglePw = (field) => setShowPw(prev => ({ ...prev, [field]: !prev[field] }))

    const setPw = (field) => (e) => setPwForm(prev => ({ ...prev, [field]: e.target.value }))

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setPwErrors({})

        // Validação simples no client
        if (pwForm.password !== pwForm.password_confirmation) {
            setPwErrors({ password_confirmation: ['As senhas não conferem.'] })
            return
        }

        setPwLoading(true)
        try {
            const { data } = await api.put('/auth/password', pwForm)
            // Atualiza o token no localStorage com o novo token recebido
            if (data.token) {
                localStorage.setItem('qf_token', data.token)
            }
            toast.success('Senha alterada com sucesso! 🔐')
            setPwForm({ current_password: '', password: '', password_confirmation: '' })
        } catch (err) {
            if (err.response?.status === 422) {
                setPwErrors(err.response.data.errors || {})
            } else {
                toast.error('Erro ao alterar a senha.')
            }
        } finally {
            setPwLoading(false)
        }
    }

    const avatarLetter = user?.name?.charAt(0).toUpperCase() || '?'

    return (
        <Layout title="Perfil">
            <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* ─── Card de identidade ─────────────────────────── */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: 64, height: 64,
                        borderRadius: '50%',
                        background: 'var(--gradient-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.6rem', color: '#fff', flexShrink: 0,
                        boxShadow: 'var(--shadow-glow)',
                    }}>
                        {avatarLetter}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            {user?.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {user?.email}
                        </div>
                        {user?.nivel && (
                            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-indigo">🏅 {user.nivel}</span>
                                {user?.plano === 'pro'
                                    ? <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>⭐ PRO</span>
                                    : <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}>🚪 Free</span>
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Alterar nome ───────────────────────────────── */}
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-accent)' }}>
                        ✏️ Alterar Nome
                    </h2>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label className="form-label">Nome completo</label>
                            <input
                                type="text"
                                className={`form-input ${nameErrors.name ? 'error' : ''}`}
                                placeholder="Seu nome"
                                value={nameForm.name}
                                onChange={(e) => setNameForm({ name: e.target.value })}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                            {nameErrors.name && (
                                <span className="form-error">⚠ {nameErrors.name[0]}</span>
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">E-mail</label>
                            <input
                                type="email"
                                className="form-input"
                                value={user?.email || ''}
                                disabled
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                                O e-mail não pode ser alterado.
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={nameLoading || nameForm.name.trim() === (user?.name || '')}
                            style={{ marginTop: '1.25rem' }}
                        >
                            {nameLoading ? <Spinner size="sm" /> : 'Salvar nome'}
                        </button>
                    </form>
                </div>

                {/* ─── Alterar senha ──────────────────────────────── */}
                <div className="card">
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-accent)' }}>
                        🔐 Alterar Senha
                    </h2>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label className="form-label">Senha atual</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw.current ? 'text' : 'password'}
                                    className={`form-input ${pwErrors.current_password ? 'error' : ''}`}
                                    placeholder="Sua senha atual"
                                    value={pwForm.current_password}
                                    onChange={setPw('current_password')}
                                    required
                                    autoComplete="current-password"
                                    style={{ paddingRight: '2.75rem' }}
                                />
                                <button type="button" onClick={() => togglePw('current')} tabIndex={-1} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }} title={showPw.current ? 'Ocultar' : 'Mostrar'}>
                                    {showPw.current ? '🙈' : '👁'}
                                </button>
                            </div>
                            {pwErrors.current_password && (
                                <span className="form-error">⚠ {pwErrors.current_password[0]}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Nova senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw.new ? 'text' : 'password'}
                                    className={`form-input ${pwErrors.password ? 'error' : ''}`}
                                    placeholder="Mínimo 8 caracteres"
                                    value={pwForm.password}
                                    onChange={setPw('password')}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    style={{ paddingRight: '2.75rem' }}
                                />
                                <button type="button" onClick={() => togglePw('new')} tabIndex={-1} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }} title={showPw.new ? 'Ocultar' : 'Mostrar'}>
                                    {showPw.new ? '🙈' : '👁'}
                                </button>
                            </div>
                            {pwErrors.password && (
                                <span className="form-error">⚠ {pwErrors.password[0]}</span>
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Confirmar nova senha</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw.confirm ? 'text' : 'password'}
                                    className={`form-input ${pwErrors.password_confirmation ? 'error' : ''}`}
                                    placeholder="Repita a nova senha"
                                    value={pwForm.password_confirmation}
                                    onChange={setPw('password_confirmation')}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    style={{ paddingRight: '2.75rem' }}
                                />
                                <button type="button" onClick={() => togglePw('confirm')} tabIndex={-1} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }} title={showPw.confirm ? 'Ocultar' : 'Mostrar'}>
                                    {showPw.confirm ? '🙈' : '👁'}
                                </button>
                            </div>
                            {pwErrors.password_confirmation && (
                                <span className="form-error">⚠ {pwErrors.password_confirmation[0]}</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={pwLoading || !pwForm.current_password || !pwForm.password || !pwForm.password_confirmation}
                            style={{ marginTop: '1.25rem' }}
                        >
                            {pwLoading ? <Spinner size="sm" /> : 'Alterar senha'}
                        </button>
                    </form>
                </div>

            </div>
        </Layout>
    )
}
