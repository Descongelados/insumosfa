import { create } from 'zustand'
import type { User, Role } from '../types'
import { supabase } from '../lib/supabase'

interface DbRow {
  id: string
  email: string
  name: string
  roles: string[]
  active: boolean
  created_at: string
}

function toUser(r: DbRow): User {
  return {
    userId: r.id,
    email: r.email,
    name: r.name,
    roles: r.roles as Role[],
    active: r.active,
    createdAt: r.created_at.split('T')[0],
  }
}

interface UsersState {
  users: User[]
  loading: boolean
  loadUsers: () => Promise<void>
  addUser: (u: Omit<User, 'userId' | 'createdAt'>, password: string) => Promise<void>
  updateUser: (userId: string, data: Partial<User>) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  toggleUser: (userId: string) => Promise<void>
  changePassword: (userId: string, newPassword: string) => Promise<void>
}

export function hasRole(user: { roles: Role[] }, ...check: Role[]): boolean {
  return check.some(r => user.roles.includes(r))
}

export const useUsersStore = create<UsersState>()((set, get) => ({
  users: [],
  loading: false,

  async loadUsers() {
    set({ loading: true })
    try {
      const { data, error } = await supabase.rpc('erp_get_users')
      if (!error && data) {
        set({ users: (data as DbRow[]).map(toUser) })
      }
    } finally {
      set({ loading: false })
    }
  },

  async addUser(userData, password) {
    const roles = userData.roles.length ? userData.roles : (['ventas'] as Role[])
    const { data, error } = await supabase.rpc('erp_create_user', {
      p_email: userData.email,
      p_name: userData.name,
      p_roles: roles,
      p_password: password,
    })
    if (!error && data && (data as DbRow[]).length > 0) {
      set(s => ({ users: [...s.users, toUser((data as DbRow[])[0])] }))
    }
  },

  async updateUser(userId, data) {
    const current = get().users.find(u => u.userId === userId)
    if (!current) return
    const updated = { ...current, ...data }
    const { error } = await supabase.rpc('erp_update_user', {
      p_id: userId,
      p_email: updated.email,
      p_name: updated.name,
      p_roles: updated.roles,
    })
    if (!error) {
      set(s => ({ users: s.users.map(u => u.userId === userId ? { ...u, ...data } : u) }))
    }
  },

  async deleteUser(userId) {
    const { error } = await supabase.rpc('erp_delete_user', { p_id: userId })
    if (!error) {
      set(s => ({ users: s.users.filter(u => u.userId !== userId) }))
    }
  },

  async toggleUser(userId) {
    const user = get().users.find(u => u.userId === userId)
    if (!user) return
    const newActive = !user.active
    const { error } = await supabase.rpc('erp_toggle_user', { p_id: userId, p_active: newActive })
    if (!error) {
      set(s => ({ users: s.users.map(u => u.userId === userId ? { ...u, active: newActive } : u) }))
    }
  },

  async changePassword(userId, newPassword) {
    await supabase.rpc('erp_change_password', { p_id: userId, p_password: newPassword })
  },
}))
