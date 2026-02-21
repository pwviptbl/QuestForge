import axios from 'axios'

// Instância Axios configurada para a API do QuestForge
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000, // 30s (Gemini pode demorar)
})

// ─── Interceptor de Request: injeta o Bearer Token automaticamente ──
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('qf_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// ─── Interceptor de Response: trata erros globais ──────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Token expirado ou inválido → desloga o usuário
        if (error.response?.status === 401) {
            localStorage.removeItem('qf_token')
            localStorage.removeItem('qf_user')
            window.location.href = '/login'
        }

        // Erros 422 (Validação) — retorna pro componente tratar
        if (error.response?.status === 422) {
            return Promise.reject(error)
        }

        return Promise.reject(error)
    }
)

export default api
