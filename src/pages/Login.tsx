import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Lock, Mail, CircleAlert as AlertCircle } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/')
    } else {
      setError(result.error ?? 'Error de autenticación')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <span className="text-white font-bold text-2xl">IF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">InsumosFa ERP</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma de Gestión Empresarial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="label">Correo electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className="input pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="input pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center py-2.5"
            disabled={submitting}
          >
            {submitting ? 'Verificando…' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
