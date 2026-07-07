import { create } from 'zustand'
import type { AuthUser, Role } from '../types'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

interface DbRow {
  id: string
  email: string
  name: string
  roles: string[]
  active: boolean
  created_at: string
}

function fakeJwt(email: string) {
  return btoa(JSON.stringify({ sub: email, iat: Date.now(), exp: Date.now() + 86400000 }))
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const raw = localStorage.getItem('erp_user')
      if (!raw) return null
      const parsed = JSON.parse(raw) as AuthUser & { role?: string }
      if (!parsed.roles) {
        parsed.roles = parsed.role ? [parsed.role as Role] : []
        localStorage.setItem('erp_user', JSON.stringify(parsed))
      }
      return parsed as AuthUser
    } catch { return null }
  })(),

  async login(email, password) {
    try {
      const { data, error } = await supabase.rpc('erp_verify_login', {
        p_email: email.trim().toLowerCase(),
        p_password: password,
      })
      if (error) return { ok: false, error: 'Error de conexión. Intente de nuevo.' }
      const rows = data as DbRow[] | null
      if (!rows || rows.length === 0) return { ok: false, error: 'Credenciales incorrectas' }
      const row = rows[0]
      if (!row.active) return { ok: false, error: 'Usuario inactivo' }
      const authed: AuthUser = {
        userId: row.id,
        email: row.email,
        name: row.name,
        roles: row.roles as Role[],
        active: row.active,
        createdAt: row.created_at.split('T')[0],
        token: fakeJwt(row.email),
      }
      localStorage.setItem('erp_user', JSON.stringify(authed))
      set({ user: authed })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Error de conexión. Intente de nuevo.' }
    }
  },

  logout() {
    localStorage.removeItem('erp_user')
    set({ user: null })
  },
}))
