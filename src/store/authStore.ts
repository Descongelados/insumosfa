import { create } from 'zustand'
import type { AuthUser } from '../types'
import { passwordMap, useUsersStore } from './usersStore'

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
    // Leer usuarios vivos del store (incluye los creados en runtime)
    const { users } = useUsersStore.getState()
    const found = users.find(u => u.email === email)
    if (!found) return { ok: false, error: 'Usuario no encontrado' }
    if (!found.active) return { ok: false, error: 'Usuario inactivo' }
    if (passwordMap[email] !== password) return { ok: false, error: 'Contraseña incorrecta' }
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
