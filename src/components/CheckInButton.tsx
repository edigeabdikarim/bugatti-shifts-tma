import { useState } from 'react'
import { getCurrentPosition, checkIn, checkOut } from '../api/gasClient'
import { hapticSuccess, hapticError, showAlert } from '../hooks/useTelegram'

interface CheckInButtonProps {
  shiftId: string
  type: 'check_in' | 'check_out'
  onSuccess: () => void
}

export default function CheckInButton({ type, onSuccess }: CheckInButtonProps) {
  const [loading, setLoading] = useState(false)

  const label = type === 'check_in' ? 'Отметиться (приход)' : 'Отметиться (уход)'
  const colorClass = type === 'check_in'
    ? 'bg-blue-600 active:bg-blue-700'
    : 'bg-green-600 active:bg-green-700'

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const coords = await getCurrentPosition()
      const result = type === 'check_in'
        ? await checkIn(coords.latitude, coords.longitude)
        : await checkOut(coords.latitude, coords.longitude)

      hapticSuccess()
      showAlert(
        `✓ ${type === 'check_in' ? 'Приход' : 'Уход'} зафиксирован\n${result.geo_message}`,
        onSuccess
      )
    } catch (err) {
      hapticError()
      showAlert(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-opacity ${colorClass} ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Определяю геолокацию…
        </span>
      ) : label}
    </button>
  )
}
