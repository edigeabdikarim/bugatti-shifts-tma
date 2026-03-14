import type { ShiftRow } from '../api/gasClient'
import StatusBadge from './StatusBadge'
import CheckInButton from './CheckInButton'

interface TodayShiftCardProps {
  shift: ShiftRow
  onEventRecorded: () => void
}

export default function TodayShiftCard({ shift, onEventRecorded }: TodayShiftCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      {/* Магазин и статус */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{shift.store_name}</p>
          <p className="text-sm text-gray-500">{shift.store_code}</p>
        </div>
        <StatusBadge status={shift.shift_status} label={shift.shift_status_label} />
      </div>

      {/* Время */}
      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Начало</p>
          <p className="font-medium text-gray-800">{shift.planned_start_time}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Конец</p>
          <p className="font-medium text-gray-800">{shift.planned_end_time}</p>
        </div>
        {shift.check_in_time && (
          <div>
            <p className="text-gray-400 text-xs">Пришёл</p>
            <p className="font-medium text-green-700">{shift.check_in_time}</p>
          </div>
        )}
        {shift.check_out_time && (
          <div>
            <p className="text-gray-400 text-xs">Ушёл</p>
            <p className="font-medium text-green-700">{shift.check_out_time}</p>
          </div>
        )}
      </div>

      {/* Геостатус */}
      {shift.check_in_geo_status && (
        <p className={`text-xs ${shift.check_in_geo_status === 'within_radius' ? 'text-green-600' : 'text-orange-600'}`}>
          {shift.check_in_geo_status === 'within_radius' ? '✓ В радиусе магазина' : '⚠ Отметка вне радиуса'}
        </p>
      )}

      {/* Кнопки действий */}
      {shift.can_check_in && (
        <CheckInButton shiftId={shift.schedule_shift_id} type="check_in" onSuccess={onEventRecorded} />
      )}
      {shift.can_check_out && (
        <CheckInButton shiftId={shift.schedule_shift_id} type="check_out" onSuccess={onEventRecorded} />
      )}
      {!shift.can_check_in && !shift.can_check_out && shift.shift_status !== 'planned' && (
        <p className="text-center text-sm text-gray-400">Смена завершена</p>
      )}
    </div>
  )
}
