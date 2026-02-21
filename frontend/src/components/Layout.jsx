import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'

const NAV_ITEMS = [
    { to: '/', icon: '🏠', label: 'Meus Concursos' },
    { to: '/quiz/config', icon: '⚡', label: 'Iniciar Bateria' },
    { to: '/srs', icon: '🔄', label: 'Revisão SRS' },
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
]

export default function Layout({ children, title }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const handleLogout = async () => {
        await logout()
        toast.success('Até logo!')
        navigate('/login')
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
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
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
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {user?.nivel}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-full">
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
                            background: 'transparent', border: 'none', color: 'var(--text-primary)',
                            fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        ☰
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                        <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                            {title}
                        </h1>
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
