import { create } from 'zustand'
import type { AuthUser, Role } from '../types'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  refreshRoles: () => Promise<void>
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

export const useAuthStore = create<AuthState>((set, get) => ({
  // Rehydrate from localStorage on boot (roles come from stored session)
  user: (() => {
    try {
      const raw = localStorage.getItem('erp_user')
      if (!raw) return null
      const parsed = JSON.parse(raw) as AuthUser & { role?: string }
      // Backward compat: old sessions stored 'role' (string) instead of 'roles' (array)
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
        // Roles always come from the DB response — never trust localStorage for this
        roles: row.roles as Role[],
        active: row.active,
        createdAt: row.created_at.split('T')[0],
      }
      localStorage.setItem('erp_user', JSON.stringify(authed))
      set({ user: authed })
      return { ok: true }
    } catch {
      return { ok: false, error: 'Error de conexión. Intente de nuevo.' }
    }
  },

  /**
   * Re-fetches the user's roles from the DB and updates the session.
   * Call on app mount to ensure localStorage-cached roles are still valid.
   */
  async refreshRoles() {
    const current = get().user
    if (!current) return
    try {
      const { data } = await supabase.rpc('erp_verify_login_by_id', {
        p_id: current.userId,
      })
      const rows = data as DbRow[] | null
      if (!rows || rows.length === 0) {
        // User was deleted or deactivated — force logout
        get().logout()
        return
      }
      const row = rows[0]
      if (!row.active) { get().logout(); return }
      const refreshed: AuthUser = {
        ...current,
        roles: row.roles as Role[],
        active: row.active,
        name: row.name,
      }
      localStorage.setItem('erp_user', JSON.stringify(refreshed))
      set({ user: refreshed })
    } catch {
      // Network error — keep current session, don't force logout
    }
  },

  logout() {
    localStorage.removeItem('erp_user')
    set({ user: null })
  },
}))
