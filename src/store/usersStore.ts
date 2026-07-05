import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Role } from '../types'
import { SEED_USERS } from '../data/seed'

// Contraseñas en memoria — también se persisten en localStorage bajo 'erp_passwords'
export let passwordMap: Record<string, string> = (() => {
  try {
    const raw = localStorage.getItem('erp_passwords')
    if (raw) return JSON.parse(raw) as Record<string, string>
  } catch { /* ignore */ }
  return {
    'admin@insumosfa.com': 'admin123',
    'carlos@insumosfa.com': 'ventas123',
    'maria@insumosfa.com': 'compras123',
    'pedro@insumosfa.com': 'almacen123',
    'laura@insumosfa.com': 'admin123',
  }
})()

function savePasswordMap() {
  try { localStorage.setItem('erp_passwords', JSON.stringify(passwordMap)) } catch { /* ignore */ }
}

interface UsersState {
  users: User[]
  addUser: (u: Omit<User, 'userId' | 'createdAt'>, password: string) => void
  updateUser: (userId: string, data: Partial<User>) => void
  deleteUser: (userId: string) => void
  toggleUser: (userId: string) => void
  changePassword: (userId: string, newPassword: string) => void
}

/** Devuelve true si el usuario tiene al menos uno de los roles indicados */
export function hasRole(user: { roles: Role[] }, ...check: Role[]): boolean {
  return check.some(r => user.roles.includes(r))
}

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: SEED_USERS,

      addUser(data, password) {
        const safeData = { ...data, roles: data.roles.length ? data.roles : ['ventas' as Role] }
        const user: User = {
          ...safeData,
          userId: `u${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        }
        passwordMap[user.email] = password
        savePasswordMap()
        set((s) => ({ users: [...s.users, user] }))
      },

      updateUser(userId, data) {
        set((s) => {
          const prev = s.users.find(u => u.userId === userId)
          if (data.email && prev && data.email !== prev.email) {
            passwordMap[data.email] = passwordMap[prev.email] ?? ''
            delete passwordMap[prev.email]
            savePasswordMap()
          }
          return { users: s.users.map((u) => (u.userId === userId ? { ...u, ...data } : u)) }
        })
      },

      deleteUser(userId) {
        set((s) => {
          const user = s.users.find(u => u.userId === userId)
          if (user) {
            delete passwordMap[user.email]
            savePasswordMap()
          }
          return { users: s.users.filter(u => u.userId !== userId) }
        })
      },

      toggleUser(userId) {
        set((s) => ({ users: s.users.map((u) => (u.userId === userId ? { ...u, active: !u.active } : u)) }))
      },

      changePassword(userId, newPassword) {
        const user = get().users.find(u => u.userId === userId)
        if (user) {
          passwordMap[user.email] = newPassword
          savePasswordMap()
        }
      },
    }),
    { name: 'erp_users' }
  )
)
