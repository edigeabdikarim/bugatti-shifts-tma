import { useState, useEffect } from 'react'
import { getStores, submitRegistration, type StoreInfo } from '../api/gasClient'
import { hapticSuccess, hapticError } from '../hooks/useTelegram'

interface RegistrationPageProps {
  onSubmitted: () => void
}

export default function RegistrationPage({ onSubmitted }: RegistrationPageProps) {
  const [fullName, setFullName] = useState('')
  const [storeId, setStoreId] = useState('')
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStores()
      .then((res) => setStores(res.stores))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !storeId) return
    setLoading(true)
    setError('')
    try {
      await submitRegistration(fullName.trim(), storeId)
      hapticSuccess()
      onSubmitted()
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
        <div className="text-center space-y-2">
          <div className="text-5xl">👤</div>
          <h1 className="text-2xl font-bold text-gray-900">Регистрация</h1>
          <p className="text-gray-500 text-sm">Заполни данные — менеджер подтвердит доступ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Полное имя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Имя Фамилия"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Магазин</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Выбери магазин…</option>
              {stores.map((s) => (
                <option key={s.store_id} value={s.store_id}>
                  {s.store_name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !fullName.trim() || !storeId}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-base disabled:opacity-60 active:bg-blue-700 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Отправляю…
              </span>
            ) : 'Отправить заявку'}
          </button>
        </form>
      </div>
    </div>
  )
}
