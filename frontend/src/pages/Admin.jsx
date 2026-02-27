import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

// ─── Badge de status (clicável) ──────────────────────────────
function StatusBadge({ isAdmin, isBlocked, onClick, loading }) {
    const base = { cursor: isBlocked ? 'default' : 'pointer', userSelect: 'none', transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }
    if (loading) return <span className="badge" style={{ ...base, opacity: 0.5 }}><Spinner size="sm" /></span>
    if (isBlocked) return <span className="badge" style={{ ...base, background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}>🚫 Bloqueado</span>
    if (isAdmin) return (
        <span className="badge badge-warning" style={base} onClick={onClick} title="Clique para remover admin">
            👑 Admin
        </span>
    )
    return (
        <span className="badge" style={{ ...base, background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }} onClick={onClick} title="Clique para tornar admin">
            👤 Usuário
        </span>
    )
}

function PlanoBadge({ plano, onClick, loading }) {
    const base = { cursor: 'pointer', userSelect: 'none', transition: 'opacity 0.15s', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }
    if (loading) return <span className="badge" style={{ ...base, opacity: 0.5 }}><Spinner size="sm" /></span>
    if (plano === 'pro')
        return <span className="badge" style={{ ...base, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }} onClick={onClick} title="Clique para remover PRO">⭐ PRO</span>
    return <span className="badge" style={{ ...base, background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }} onClick={onClick} title="Clique para tornar PRO">🚪 Free</span>
}
export default function Admin() {
    const { user: me } = useAuth()
    const toast = useToast()
    const navigate = useNavigate()

    const [users, setUsers] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null) // id do usuário sendo processado

    // ─── Ações ─────────────────────────────────────────────────
    const setPlano = async (user, plano) => {
        setActionLoading(`plano-${user.id}`)
        try {
            const { data } = await api.put(`/admin/users/${user.id}/plano`, { plano })
            setUsers(prev => prev.map(u => u.id === user.id ? data.user : u))
            toast.success(data.message)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao alterar plano.')
        } finally {
            setActionLoading(null)
        }
    }
    const [modalDelete, setModalDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    // Redireciona se não for admin
    useEffect(() => {
        if (me && !me.is_admin) navigate('/', { replace: true })
    }, [me, navigate])

    // ─── Carrega usuários ─────────────────────────────────────
    const fetchUsers = useCallback(async (q = '') => {
        setLoading(true)
        try {
            const params = q ? { search: q } : {}
            const { data } = await api.get('/admin/users', { params })
            setUsers(data.users)
        } catch {
            toast.error('Erro ao carregar usuários.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    // Debounce na busca
    useEffect(() => {
        const timer = setTimeout(() => fetchUsers(search), 350)
        return () => clearTimeout(timer)
    }, [search, fetchUsers])

    // ─── Ações ────────────────────────────────────────────────
    const toggleAdmin = async (user) => {
        setActionLoading(`admin-${user.id}`)
        try {
            const { data } = await api.put(`/admin/users/${user.id}/toggle-admin`)
            setUsers(prev => prev.map(u => u.id === user.id ? data.user : u))
            toast.success(data.message)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao alterar permissão.')
        } finally {
            setActionLoading(null)
        }
    }

    const toggleBlock = async (user) => {
        setActionLoading(`block-${user.id}`)
        try {
            const { data } = await api.put(`/admin/users/${user.id}/toggle-block`)
            setUsers(prev => prev.map(u => u.id === user.id ? data.user : u))
            toast.success(data.message)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao bloquear/desbloquear.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async () => {
        if (!modalDelete) return
        setDeleting(true)
        try {
            const { data } = await api.delete(`/admin/users/${modalDelete.id}`)
            setUsers(prev => prev.filter(u => u.id !== modalDelete.id))
            toast.success(data.message)
            setModalDelete(null)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erro ao excluir usuário.')
        } finally {
            setDeleting(false)
        }
    }

    const isMe = (id) => id === me?.id

    return (
        <Layout title="Painel Administrativo">

            {/* ─── Cabeçalho e busca ──────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {users.length} usuário{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div style={{ position: 'relative', minWidth: 260 }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.25rem', margin: 0 }}
                        placeholder="Buscar por nome ou e-mail…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ─── Tabela ─────────────────────────────────────── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div className="flex-center" style={{ padding: '4rem' }}>
                        <Spinner size="lg" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem' }}>
                        <div className="empty-state-icon">👥</div>
                        <h3>Nenhum usuário encontrado</h3>
                        {search && <p>Tente outro termo de busca.</p>}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                    {['Usuário', 'E-mail', 'Nível', 'Plano', 'Status', 'Membro desde', 'Ações'].map(h => (
                                        <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr
                                        key={u.id}
                                        style={{
                                            borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                                            background: isMe(u.id) ? 'rgba(99,102,241,0.04)' : 'transparent',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => !isMe(u.id) && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                        onMouseLeave={e => !isMe(u.id) && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {/* Usuário */}
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: '50%',
                                                    background: isMe(u.id) ? 'var(--gradient-brand)' : 'rgba(99,102,241,0.2)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0,
                                                }}>
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {u.name}
                                                        {isMe(u.id) && <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>(você)</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* E-mail */}
                                        <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-secondary)' }}>
                                            {u.email}
                                        </td>

                                        {/* Nível */}
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            <span className="badge badge-indigo">{u.nivel}</span>
                                        </td>

                                        {/* Plano — clicável */}
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            {isMe(u.id)
                                                ? <PlanoBadge plano={u.plano} />
                                                : <PlanoBadge
                                                    plano={u.plano}
                                                    loading={actionLoading === `plano-${u.id}`}
                                                    onClick={() => !actionLoading && setPlano(u, u.plano === 'pro' ? 'free' : 'pro')}
                                                />
                                            }
                                        </td>

                                        {/* Status — clicável (exceto bloqueados e o próprio admin) */}
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            {isMe(u.id)
                                                ? <StatusBadge isAdmin={u.is_admin} isBlocked={u.is_blocked} />
                                                : <StatusBadge
                                                    isAdmin={u.is_admin}
                                                    isBlocked={u.is_blocked}
                                                    loading={actionLoading === `admin-${u.id}`}
                                                    onClick={!u.is_blocked ? () => !actionLoading && toggleAdmin(u) : undefined}
                                                />
                                            }
                                        </td>

                                        {/* Data */}
                                        <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                        </td>

                                        {/* Ações */}
                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                            {isMe(u.id) ? (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {/* Bloquear / Ativar */}
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => toggleBlock(u)}
                                                        disabled={!!actionLoading}
                                                        style={{
                                                            background: u.is_blocked ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                            border: `1px solid ${u.is_blocked ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                            color: u.is_blocked ? '#10b981' : '#f59e0b',
                                                        }}
                                                    >
                                                        {actionLoading === `block-${u.id}`
                                                            ? <Spinner size="sm" />
                                                            : u.is_blocked ? '✅ Ativar' : '🚫 Bloquear'
                                                        }
                                                    </button>

                                                    {/* Excluir */}
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => setModalDelete(u)}
                                                        disabled={!!actionLoading}
                                                        style={{
                                                            background: 'rgba(244,63,94,0.12)',
                                                            border: '1px solid rgba(244,63,94,0.3)',
                                                            color: '#f43f5e',
                                                        }}
                                                    >
                                                        🗑 Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── Modal de confirmação de exclusão ───────────── */}
            <Modal
                open={!!modalDelete}
                onClose={() => !deleting && setModalDelete(null)}
                title="Confirmar exclusão"
            >
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Tem certeza que deseja excluir o usuário{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{modalDelete?.name}</strong>?
                    <br />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                        Esta ação é irreversível e removerá todos os dados do usuário.
                    </span>
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setModalDelete(null)}
                        disabled={deleting}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', color: '#f43f5e' }}
                    >
                        {deleting ? <Spinner size="sm" /> : '🗑 Excluir'}
                    </button>
                </div>
            </Modal>
        </Layout>
    )
}
