import { useState } from 'react'
import { linkAccount, type Identity } from '../api/gasClient'
import { hapticSuccess, hapticError, IS_DEV } from '../hooks/useTelegram'

interface OnboardingPageProps {
  onLinked: (identity: Identity) => void
}

export default function OnboardingPage({ onLinked }: OnboardingPageProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setError('')
    try {
      const result = await linkAccount(code.trim())
      hapticSuccess()
      onLinked(result.identity)
    } catch (err) {
      hapticError()
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Лого/заголовок */}
        <div className="text-center space-y-2">
          <div className="text-5xl">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Расписание смен</h1>
          <p className="text-gray-500 text-sm">
            Введи код сотрудника, чтобы привязать Telegram-аккаунт
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Код сотрудника
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Например: EMP_001"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-60 active:bg-blue-700 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Проверяю…
              </span>
            ) : 'Войти'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Код сотрудника можно узнать у своего менеджера
        </p>

        {/* Dev mode helper */}
        {IS_DEV && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
            <strong>Dev mode:</strong> Введи employee_id из листа Employees.
            Установи свой Telegram ID в localStorage: <code>dev_telegram_user_id</code>
          </div>
        )}
      </div>
    </div>
  )
}
