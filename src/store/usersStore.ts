import { create } from 'zustand'
import type { User, Role } from '../types'
import { SEED_USERS } from '../data/seed'

// Contraseñas en memoria (en producción estarían hasheadas en backend)
// Se exporta para que authStore pueda validar sin circular dependency
export const passwordMap: Record<string, string> = {
  'admin@insumosfa.com': 'admin123',
  'carlos@insumosfa.com': 'ventas123',
  'maria@insumosfa.com': 'compras123',
  'pedro@insumosfa.com': 'almacen123',
  'laura@insumosfa.com': 'admin123',
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

export const useUsersStore = create<UsersState>((set, get) => ({
  users: SEED_USERS,

  addUser(data, password) {
    // Garantizar al menos un rol
    const safeData = { ...data, roles: data.roles.length ? data.roles : ['ventas' as Role] }
    const user: User = {
      ...safeData,
      userId: `u${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    passwordMap[user.email] = password
    set((s) => ({ users: [...s.users, user] }))
  },

  updateUser(userId, data) {
    set((s) => {
      const prev = s.users.find(u => u.userId === userId)
      // Si cambia el email, migrar la contraseña al nuevo email
      if (data.email && prev && data.email !== prev.email) {
        passwordMap[data.email] = passwordMap[prev.email] ?? ''
        delete passwordMap[prev.email]
      }
      return { users: s.users.map((u) => (u.userId === userId ? { ...u, ...data } : u)) }
    })
  },

  deleteUser(userId) {
    set((s) => {
      const user = s.users.find(u => u.userId === userId)
      if (user) delete passwordMap[user.email]
      return { users: s.users.filter(u => u.userId !== userId) }
    })
  },

  toggleUser(userId) {
    set((s) => ({ users: s.users.map((u) => (u.userId === userId ? { ...u, active: !u.active } : u)) }))
  },

  changePassword(userId, newPassword) {
    const user = get().users.find(u => u.userId === userId)
    if (user) passwordMap[user.email] = newPassword
  },
}))
