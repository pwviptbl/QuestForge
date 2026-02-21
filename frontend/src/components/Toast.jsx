import { useState, useCallback, createContext, useContext } from 'react'

/* ─── Context ────────────────────────────────────────────────── */
const ToastContext = createContext(null)

/* ─── Provider ───────────────────────────────────────────────── */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const toast = {
        success: (msg, dur) => addToast(msg, 'success', dur),
        error: (msg, dur) => addToast(msg, 'error', dur),
        warning: (msg, dur) => addToast(msg, 'warning', dur),
        info: (msg, dur) => addToast(msg, 'info', dur),
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
    return ctx
}

/* ─── Container de Toasts ────────────────────────────────────── */
function ToastContainer({ toasts, onRemove }) {
    return (
        <div style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
            maxWidth: '380px',
            width: '100%',
        }}>
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onRemove={onRemove} />
            ))}
        </div>
    )
}

/* ─── Item de Toast ──────────────────────────────────────────── */
const CONFIG = {
    success: { icon: '✅', color: 'var(--success)', bg: 'var(--success-bg)', border: 'rgba(16,185,129,0.3)' },
    error: { icon: '❌', color: 'var(--error)', bg: 'var(--error-bg)', border: 'rgba(244,63,94,0.3)' },
    warning: { icon: '⚠️', color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'rgba(245,158,11,0.3)' },
    info: { icon: 'ℹ️', color: 'var(--cyan)', bg: 'var(--info-bg)', border: 'rgba(6,182,212,0.3)' },
}

function ToastItem({ toast, onRemove }) {
    const cfg = CONFIG[toast.type] || CONFIG.info
    return (
        <div
            className="animate-fade-in"
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: '#111827',
                border: `1px solid ${cfg.border}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
            }}
            onClick={() => onRemove(toast.id)}
        >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cfg.icon}</span>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.5, flex: 1 }}>
                {toast.message}
            </p>
            <button
                onClick={(e) => { e.stopPropagation(); onRemove(toast.id) }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0 }}
            >
                ×
            </button>
        </div>
    )
}
