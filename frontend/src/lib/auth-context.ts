import { createContext, useContext } from 'react'

export type Role = 'admin' | 'member'

export type User = {
  id: number
  username: string
  full_name: string
  role: Role
  role_display: string
}

export type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function displayName(user: User) {
  return user.full_name || user.username
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider.')
  }
  return context
}
