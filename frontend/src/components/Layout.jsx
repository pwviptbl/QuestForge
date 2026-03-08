import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConcursoFocus } from '../contexts/ConcursoFocusContext'
import { useToast } from './Toast'

const NAV_ITEMS = [
    { to: '/', icon: '🏠', label: 'Meus Concursos' },
    { to: '/quiz/config', icon: '⚡', label: 'Iniciar Questões' },
    { to: '/srs', icon: '🔄', label: 'Revisão' },
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/perfil', icon: '👤', label: 'Perfil' },
]

const ADMIN_ITEM = { to: '/admin', icon: '🛡️', label: 'Administração' }

export default function Layout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { user, logout } = useAuth()
    const {
        concursos,
        concursosLoading,
        focusedConcursoId,
        focusedConcurso,
        setFocusedConcursoId,
        updatingFocus,
    } = useConcursoFocus()
    const navigate = useNavigate()
    const toast = useToast()

    const handleLogout = async () => {
        await logout()
        toast.success('Até logo!')
        navigate('/login')
    }

    const handleFocusChange = async (event) => {
        try {
            const nextValue = event.target.value === '' ? null : Number(event.target.value)
            await setFocusedConcursoId(nextValue)
            toast.success(nextValue === null ? 'Visão geral ativada.' : 'Concurso em foco atualizado.')
        } catch {
            toast.error('Erro ao atualizar o concurso em foco.')
        }
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>

            {/* ─── Overlay mobile ───────────────────────────────── */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 40,
                    }}
                    className="mobile-overlay"
                />
            )}

            {/* ─── Sidebar ──────────────────────────────────────── */}
            <aside
                className={`sidebar-desktop ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}
                style={{
                    width: 'var(--sidebar-width)',
                    minHeight: '100vh',
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem 0',
                    position: 'sticky',
                    top: 0,
                    flexShrink: 0,
                }}>
                {/* Logo */}
                <div className="desktop-logo-container" style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                            width: 36, height: 36,
                            background: 'var(--gradient-brand)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', flexShrink: 0,
                            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                        }}>🎯</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>QuestForge</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estude com IA</div>
                        </div>
                    </div>
                </div>

                {/* Navegação */}
                <nav style={{ flex: 1, padding: '0 0.75rem' }}>
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            onClick={() => setSidebarOpen(false)}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.7rem 0.875rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: '0.25rem',
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                                border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'transparent'} `,
                                fontWeight: isActive ? 600 : 400,
                                fontSize: '0.9rem',
                            })}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}

                    {/* Link de admin — visível apenas para administradores */}
                    {user?.is_admin && (
                        <>
                            <div style={{ height: '1px', background: 'var(--border)', margin: '0.625rem 0.875rem' }} />
                            <NavLink
                                to={ADMIN_ITEM.to}
                                onClick={() => setSidebarOpen(false)}
                                style={({ isActive }) => ({
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.7rem 0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '0.25rem',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    color: isActive ? '#f59e0b' : '#d97706',
                                    background: isActive ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)',
                                    border: `1px solid ${isActive ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.15)'}`,
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '0.9rem',
                                })}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{ADMIN_ITEM.icon}</span>
                                {ADMIN_ITEM.label}
                            </NavLink>
                        </>
                    )}

                    {/* Novo concurso */}
                    <NavLink
                        to="/concursos/novo"
                        onClick={() => setSidebarOpen(false)}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.7rem 0.875rem',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '0.5rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                            color: isActive ? 'var(--text-primary)' : 'var(--indigo-light)',
                            background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            fontWeight: 600, fontSize: '0.9rem',
                        })}
                    >
                        <span>➕</span> Novo Concurso
                    </NavLink>
                </nav>

                {/* Perfil do usuário */}
                <div style={{ padding: '1rem 1.5rem 1.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--gradient-brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.9rem', color: '#fff', flexShrink: 0,
                        }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.nivel}</span>
                                {user?.plano === 'pro'
                                    ? <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', lineHeight: 1.4 }}>⭐ PRO</span>
                                    : <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(100,116,139,0.15)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)', lineHeight: 1.4 }}>Free</span>
                                }
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-full" style={{ marginBottom: '1rem' }}>
                        🚪 Sair
                    </button>
                </div>
            </aside>

            {/* ─── Conteúdo principal ───────────────────────────── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header mobile (visível apenas em telas menores) */}
                <div className="mobile-header-bar">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            background: 'var(--bg-glass)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                            fontSize: '1.25rem', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ☰
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                        <div style={{
                            width: 28, height: 28,
                            background: 'var(--gradient-brand)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', flexShrink: 0,
                        }}>🎯</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                            QuestForge
                        </div>
                    </div>
                </div>

                {/* Header da página */}
                {title && (
                    <header style={{
                        padding: '1.5rem 2rem',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(13,18,36,0.8)',
                        backdropFilter: 'blur(20px)',
                        position: 'sticky', top: 0, zIndex: 10,
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap',
                        }}>
                            <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                                {title}
                            </h1>

                            <div style={{ minWidth: 240, marginLeft: 'auto' }}>
                                <label
                                    htmlFor="concurso-foco-global"
                                    style={{
                                        display: 'block',
                                        fontSize: '0.72rem',
                                        color: 'var(--text-muted)',
                                        marginBottom: '0.35rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    Concurso em foco
                                </label>
                                <select
                                    id="concurso-foco-global"
                                    className="form-input"
                                    value={focusedConcursoId ?? ''}
                                    onChange={handleFocusChange}
                                    disabled={concursosLoading || updatingFocus}
                                    style={{ minWidth: 240 }}
                                >
                                    <option value="">Todos os concursos</option>
                                    {focusedConcursoId !== null && !focusedConcurso && (
                                        <option value={focusedConcursoId}>Concurso em foco atual</option>
                                    )}
                                    {concursos.map(concurso => (
                                        <option key={concurso.id} value={concurso.id}>
                                            {concurso.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </header>
                )}

                {/* Conteúdo */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }} className="animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
