// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'

declare global {
  interface Window {
    netlifyIdentity: {
      on: (event: string, cb: (user?: unknown) => void) => void
      open: (type?: 'login' | 'signup') => void
      logout: () => void
      currentUser: () => { id: string; email: string; token?: { access_token: string } } | null
    }
  }
}

export interface AuthUser {
  id: string
  email: string
  token?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const ni = window.netlifyIdentity
    if (!ni) return

    const current = ni.currentUser()
    if (current) setUser({ id: current.id, email: current.email, token: current.token?.access_token })

    ni.on('login', (u: unknown) => {
      const cu = u as ReturnType<typeof ni.currentUser>
      if (cu) setUser({ id: cu.id, email: cu.email, token: cu.token?.access_token })
    })
    ni.on('logout', () => setUser(null))
  }, [])

  const login  = () => window.netlifyIdentity?.open('login')
  const logout = () => window.netlifyIdentity?.logout()

  return { user, login, logout }
}
