import { create } from 'zustand'
import type { AuthUser } from '../types'

// Simulated password map (in real app this would be hashed server-side)
const CREDENTIALS: Record<string, string> = {
  'admin@insumosfa.com': 'admin123',
  'carlos@insumosfa.com': 'ventas123',
  'maria@insumosfa.com': 'compras123',
  'pedro@insumosfa.com': 'almacen123',
  'laura@insumosfa.com': 'admin123',
}

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
}

function fakeJwt(email: string) {
  return btoa(JSON.stringify({ sub: email, iat: Date.now(), exp: Date.now() + 86400000 }))
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('erp_user')
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch { return null }
  })(),

  login(email, password) {
    const { SEED_USERS } = (() => {
      // inline import to avoid circular issues in Vite (ESM)
      return { SEED_USERS: [
        { userId: 'u1', name: 'Admin Sistema', email: 'admin@insumosfa.com', role: 'director' as const, active: true, createdAt: '2024-01-01' },
        { userId: 'u2', name: 'Carlos Ventas', email: 'carlos@insumosfa.com', role: 'ventas' as const, active: true, createdAt: '2024-01-05' },
        { userId: 'u3', name: 'María Compras', email: 'maria@insumosfa.com', role: 'compras' as const, active: true, createdAt: '2024-01-05' },
        { userId: 'u4', name: 'Pedro Almacén', email: 'pedro@insumosfa.com', role: 'almacen' as const, active: true, createdAt: '2024-01-10' },
        { userId: 'u5', name: 'Laura Admin', email: 'laura@insumosfa.com', role: 'administracion' as const, active: true, createdAt: '2024-01-10' },
      ] }
    })()
    const found = SEED_USERS.find((u: { email: string }) => u.email === email)
    if (!found) return { ok: false, error: 'Usuario no encontrado' }
    if (!found.active) return { ok: false, error: 'Usuario inactivo' }
    if (CREDENTIALS[email] !== password) return { ok: false, error: 'Contraseña incorrecta' }
    const authed: AuthUser = { ...found, token: fakeJwt(email) }
    localStorage.setItem('erp_user', JSON.stringify(authed))
    set({ user: authed })
    return { ok: true }
  },

  logout() {
    localStorage.removeItem('erp_user')
    set({ user: null })
  },
}))
