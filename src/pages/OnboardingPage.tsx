import { useState } from 'react'
import { checkLink, type Identity } from '../api/gasClient'
import { hapticError, IS_DEV } from '../hooks/useTelegram'

const BOT_URL = 'https://t.me/bugatti_above_entiere_bot'

interface OnboardingPageProps {
  onLinked: (identity: Identity) => void
}

export default function OnboardingPage({ onLinked }: OnboardingPageProps) {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckLink() {
    setChecking(true)
    setError('')
    try {
      const result = await checkLink()
      if (result.status === 'active' && result.identity) {
        onLinked(result.identity)
      } else if (result.status === 'pending_info' || result.status === 'pending_approval') {
        // App.tsx перезагрузит состояние через init — достаточно обновить страницу
        window.location.reload()
      } else {
        hapticError()
        setError('Номер не найден. Убедись, что поделился контактом в боте.')
      }
    } catch (err) {
      hapticError()
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Заголовок */}
        <div className="text-center space-y-2">
          <div className="text-5xl">📋</div>
          <h1 className="text-2xl font-bold text-gray-900">Расписание смен</h1>
          <p className="text-gray-500 text-sm">
            Чтобы войти, поделись своим номером телефона в боте
          </p>
        </div>

        {/* Шаги */}
        <div className="space-y-3">
          {/* Шаг 1 */}
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
              1
            </span>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Открой бота и поделись контактом</p>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg active:bg-blue-700"
              >
                Открыть бота
              </a>
            </div>
          </div>

          {/* Шаг 2 */}
          <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
              2
            </span>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Уже поделился? Войди в приложение</p>
              <button
                onClick={handleCheckLink}
                disabled={checking}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg disabled:opacity-60 active:bg-gray-800"
              >
                {checking ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Проверяю…
                  </>
                ) : 'Уже поделился → войти'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Dev mode helper */}
        {IS_DEV && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-700">
            <strong>Dev mode:</strong> Установи <code>dev_telegram_user_id</code> в localStorage,
            затем нажми «Уже поделился».
          </div>
        )}
      </div>
    </div>
  )
}
