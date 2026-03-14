import { useEffect, useState, useCallback } from 'react'
import { getTodayShifts, type ShiftRow, type Identity } from '../api/gasClient'
import TodayShiftCard from '../components/TodayShiftCard'

interface EmployeePageProps {
  identity: Identity
  onLogout: () => void
}

export default function EmployeePage({ identity, onLogout }: EmployeePageProps) {
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadShifts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getTodayShifts()
      setShifts(result.shifts)
      setDate(result.date)
      setMessage(result.message ?? '')
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadShifts() }, [loadShifts])

  const todayFormatted = date ? formatDateRu(date) : ''

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{identity.full_name}</h1>
            <p className="text-xs text-gray-500">{todayFormatted}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 active:text-gray-600"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Контент */}
      <main className="flex-1 p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-2">
            <p>{error}</p>
            <button onClick={loadShifts} className="text-red-600 font-medium underline">
              Попробовать снова
            </button>
          </div>
        )}

        {!loading && !error && shifts.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl">😴</p>
            <p className="text-gray-500">{message || 'Сегодня смен нет'}</p>
          </div>
        )}

        {!loading && !error && shifts.map((shift) => (
          <TodayShiftCard
            key={shift.schedule_shift_id}
            shift={shift}
            onEventRecorded={loadShifts}
          />
        ))}
      </main>

      {/* Кнопка обновить */}
      {!loading && (
        <div className="p-4 pb-safe-bottom">
          <button
            onClick={loadShifts}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 active:bg-gray-50"
          >
            Обновить
          </button>
        </div>
      )}
    </div>
  )
}

function formatDateRu(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
}
