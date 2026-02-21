import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

// Páginas
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import EditalForm from './pages/EditalForm'
import ConcursoDetail from './pages/ConcursoDetail'
import QuizConfig from './pages/QuizConfig'
import QuizPlay from './pages/QuizPlay'
import Dashboard from './pages/Dashboard'
import SrsResumo from './pages/SrsResumo'

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        {/* Rotas públicas */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Rotas protegidas */}
                        <Route path="/" element={
                            <ProtectedRoute><Home /></ProtectedRoute>
                        } />
                        <Route path="/concursos/novo" element={
                            <ProtectedRoute><EditalForm /></ProtectedRoute>
                        } />
                        <Route path="/concursos/:id" element={
                            <ProtectedRoute><ConcursoDetail /></ProtectedRoute>
                        } />
                        <Route path="/concursos/:id/editar" element={
                            <ProtectedRoute><EditalForm /></ProtectedRoute>
                        } />
                        <Route path="/quiz/config" element={
                            <ProtectedRoute><QuizConfig /></ProtectedRoute>
                        } />
                        <Route path="/quiz/play" element={
                            <ProtectedRoute><QuizPlay /></ProtectedRoute>
                        } />
                        <Route path="/dashboard" element={
                            <ProtectedRoute><Dashboard /></ProtectedRoute>
                        } />
                        <Route path="/srs" element={
                            <ProtectedRoute><SrsResumo /></ProtectedRoute>
                        } />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}
