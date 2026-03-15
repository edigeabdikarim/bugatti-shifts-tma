import { useEffect, useState } from 'react'
import { telegramReady } from './hooks/useTelegram'
import type { Identity } from './api/gasClient'
import { checkLink } from './api/gasClient'
import OnboardingPage from './pages/OnboardingPage'
import RegistrationPage from './pages/RegistrationPage'
import EmployeePage from './pages/EmployeePage'
import ManagerPage from './pages/ManagerPage'
import OfficePage from './pages/OfficePage'

const STORAGE_KEY = 'tma_identity'

type AppState = 'loading' | 'onboarding' | 'registration' | 'pending_approval' | 'dismissed' | 'employee' | 'manager' | 'office' | 'admin'

export default function App() {
  const [state, setState] = useState<AppState>('loading')
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    telegramReady()

    async function init() {
      // 1. Быстрый путь: localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as Identity
          setIdentity(parsed)
          setState(parsed.role === 'manager' ? 'manager' : parsed.role === 'office' ? 'office' : parsed.role === 'admin' ? 'admin' : 'employee')
          return
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }

      // 2. Проверить статус через API (по telegram_chat_id из initData)
      try {
        const result = await checkLink()
        if (result.status === 'active' && result.identity) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.identity))
          setIdentity(result.identity)
          const r = result.identity.role
          setState(r === 'manager' ? 'manager' : r === 'office' ? 'office' : r === 'admin' ? 'admin' : 'employee')
          return
        }
        if (result.status === 'pending_info') {
          setState('registration')
          return
        }
        if (result.status === 'pending_approval') {
          setState('pending_approval')
          return
        }
        if (result.status === 'dismissed') {
          setState('dismissed')
          return
        }
      } catch {
        // initData недоступен или сеть недоступна — показываем онбординг
      }

      setState('onboarding')
    }

    init()
  }, [])

  function handleLinked(newIdentity: Identity) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity))
    setIdentity(newIdentity)
    const r = newIdentity.role
    setState(r === 'manager' ? 'manager' : r === 'office' ? 'office' : r === 'admin' ? 'admin' : 'employee')
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

  if (state === 'registration') {
    return <RegistrationPage onSubmitted={() => setState('pending_approval')} />
  }

  if (state === 'pending_approval') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-xl font-bold text-gray-900">Заявка отправлена</h1>
          <p className="text-gray-500 text-sm">
            Менеджер рассмотрит заявку и пришлёт ответ в бот
          </p>
        </div>
      </div>
    )
  }

  if (state === 'dismissed') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Доступ закрыт</h1>
          <p className="text-gray-500 text-sm">
            Аккаунт деактивирован. Обратись к менеджеру или офисному сотруднику.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'employee' && identity) {
    return <EmployeePage identity={identity} onLogout={handleLogout} />
  }

  if (state === 'manager' && identity) {
    return <ManagerPage identity={identity} onLogout={handleLogout} />
  }

  if ((state === 'office' || state === 'admin') && identity) {
    return <OfficePage identity={identity} onLogout={handleLogout} />
  }

  return null
}
