import { useEffect, useState } from 'react'
import { telegramReady } from './hooks/useTelegram'
import type { Identity } from './api/gasClient'
import OnboardingPage from './pages/OnboardingPage'
import EmployeePage from './pages/EmployeePage'
import ManagerPage from './pages/ManagerPage'

const STORAGE_KEY = 'tma_identity'

type AppState = 'loading' | 'onboarding' | 'employee' | 'manager'

export default function App() {
  const [state, setState] = useState<AppState>('loading')
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    telegramReady()

    // Проверяем сохранённый identity
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Identity
        setIdentity(parsed)
        setState(parsed.role === 'manager' ? 'manager' : 'employee')
        return
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }

    setState('onboarding')
  }, [])

  function handleLinked(newIdentity: Identity) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity))
    setIdentity(newIdentity)
    setState(newIdentity.role === 'manager' ? 'manager' : 'employee')
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setIdentity(null)
    setState('onboarding')
  }

  if (state === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'onboarding') {
    return <OnboardingPage onLinked={handleLinked} />
  }

  if (state === 'employee' && identity) {
    return <EmployeePage identity={identity} onLogout={handleLogout} />
  }

  if (state === 'manager' && identity) {
    return <ManagerPage identity={identity} onLogout={handleLogout} />
  }

  return null
}
