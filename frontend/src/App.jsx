import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { token } = useAuth()
  return !token ? children : <Navigate to="/dashboard" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute><Register /></PublicRoute>
      } />
      <Route path="/dashboard" element={
        <PrivateRoute><Dashboard /></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}