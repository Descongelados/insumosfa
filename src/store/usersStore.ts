import { create } from 'zustand'
import type { User } from '../types'
import { SEED_USERS } from '../data/seed'

interface UsersState {
  users: User[]
  addUser: (u: Omit<User, 'userId' | 'createdAt'>) => void
  updateUser: (userId: string, data: Partial<User>) => void
  toggleUser: (userId: string) => void
}

export const useUsersStore = create<UsersState>((set) => ({
  users: SEED_USERS,
  addUser(data) {
    const user: User = {
      ...data,
      userId: `u${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    set((s) => ({ users: [...s.users, user] }))
  },
  updateUser(userId, data) {
    set((s) => ({ users: s.users.map((u) => (u.userId === userId ? { ...u, ...data } : u)) }))
  },
  toggleUser(userId) {
    set((s) => ({ users: s.users.map((u) => (u.userId === userId ? { ...u, active: !u.active } : u)) }))
  },
}))
