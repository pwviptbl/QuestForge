import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from './AuthContext'

const ConcursoFocusContext = createContext(null)

export function ConcursoFocusProvider({ children }) {
    const { user, isAuthenticated, loading: authLoading, updateProfile } = useAuth()

    const [concursos, setConcursos] = useState([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(null)
    const [updatingFocus, setUpdatingFocus] = useState(false)

    const refreshConcursos = async () => {
        if (!isAuthenticated) {
            setConcursos([])
            setError(null)
            setLoaded(false)
            return []
        }

        setLoading(true)

        try {
            const { data } = await api.get('/concursos')
            setConcursos(data.concursos)
            setError(null)
            setLoaded(true)
            return data.concursos
        } catch (err) {
            setConcursos([])
            setError(err)
            setLoaded(true)
            throw err
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (authLoading) return

        if (!isAuthenticated) {
            setConcursos([])
            setError(null)
            setLoaded(false)
            return
        }

        refreshConcursos().catch(() => {})
    }, [authLoading, isAuthenticated, user?.id])

    const persistedFocusedConcursoId = user?.concurso_foco_id ?? null
    const focusExistsInList = concursos.some(c => c.id === persistedFocusedConcursoId)
    const focusedConcursoId = !loaded || error || persistedFocusedConcursoId === null || focusExistsInList
        ? persistedFocusedConcursoId
        : null
    const focusedConcurso = concursos.find(c => c.id === focusedConcursoId) || null

    const setFocusedConcursoId = async (concursoId) => {
        const normalizedId = concursoId === '' || concursoId === undefined ? null : concursoId
        const parsedId = normalizedId === null ? null : Number(normalizedId)

        setUpdatingFocus(true)

        try {
            return await updateProfile({ concurso_foco_id: parsedId })
        } finally {
            setUpdatingFocus(false)
        }
    }

    return (
        <ConcursoFocusContext.Provider value={{
            concursos,
            concursosLoading: loading || authLoading,
            concursosLoaded: loaded,
            concursoError: error,
            refreshConcursos,
            focusedConcursoId,
            focusedConcurso,
            setFocusedConcursoId,
            updatingFocus,
        }}>
            {children}
        </ConcursoFocusContext.Provider>
    )
}

export function useConcursoFocus() {
    const ctx = useContext(ConcursoFocusContext)

    if (!ctx) {
        throw new Error('useConcursoFocus deve ser usado dentro do ConcursoFocusProvider')
    }

    return ctx
}
