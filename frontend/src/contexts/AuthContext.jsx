import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

// Contexto de autenticação global
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true) // verifica token salvo na inicialização

    // ─── Inicialização: verifica token salvo no localStorage ─────────
    useEffect(() => {
        const token = localStorage.getItem('qf_token')
        const saved = localStorage.getItem('qf_user')

        if (token && saved) {
            try {
                setUser(JSON.parse(saved))
            } catch {
                localStorage.removeItem('qf_user')
            }
            // Valida o token com o backend (evita tokens inválidos/expirados)
            api.get('/auth/me')
                .then(({ data }) => setUser(data.user))
                .catch(() => {
                    localStorage.removeItem('qf_token')
                    localStorage.removeItem('qf_user')
                    setUser(null)
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    // ─── Login ───────────────────────────────────────────────────────
    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('qf_token', data.token)
        localStorage.setItem('qf_user', JSON.stringify(data.user))
        setUser(data.user)
        return data.user
    }, [])

    // ─── Cadastro ────────────────────────────────────────────────────
    // Contas novas são criadas bloqueadas e aguardam aprovação do admin.
    // O backend não retorna token, portanto não fazemos login automático.
    const register = useCallback(async (name, email, password, passwordConfirmation) => {
        const { data } = await api.post('/auth/register', {
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,
        })
        return data
    }, [])

    // ─── Logout ──────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout')
        } catch {
            // Silencia erros de logout (token já pode ter expirado)
        } finally {
            localStorage.removeItem('qf_token')
            localStorage.removeItem('qf_user')
            setUser(null)
        }
    }, [])

    // ─── Atualizar perfil ─────────────────────────────────────────────
    const updateProfile = useCallback(async (dados) => {
        const { data } = await api.put('/auth/profile', dados)
        const updatedUser = data.user
        localStorage.setItem('qf_user', JSON.stringify(updatedUser))
        setUser(updatedUser)
        return updatedUser
    }, [])

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// Hook de conveniência
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth deve ser usado dentro do AuthProvider')
    return ctx
}

export default AuthContext
