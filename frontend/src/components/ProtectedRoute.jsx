import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from './Spinner'

/**
 * Componente que protege rotas autenticadas.
 * Redireciona para /login se o usuário não estiver autenticado.
 */
export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()
    const location = useLocation()

    // Aguarda a verificação inicial do token
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <Spinner size="lg" />
            </div>
        )
    }

    if (!isAuthenticated) {
        // Redireciona para login, preservando a rota que o usuário tentou acessar
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}
