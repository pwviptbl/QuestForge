/**
 * Spinner de carregamento animado.
 * Props:
 *   size: 'sm' | 'md' | 'lg' (padrão: 'md')
 *   color: string CSS (padrão: var(--indigo))
 */
export default function Spinner({ size = 'md', color }) {
    const sizes = { sm: 18, md: 28, lg: 48 }
    const px = sizes[size] || 28

    return (
        <div
            style={{
                width: px,
                height: px,
                borderRadius: '50%',
                border: `3px solid rgba(255,255,255,0.1)`,
                borderTopColor: color || 'var(--indigo)',
                animation: 'spin 0.7s linear infinite',
                flexShrink: 0,
            }}
            role="status"
            aria-label="Carregando..."
        />
    )
}
