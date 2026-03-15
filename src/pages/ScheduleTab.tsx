import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getSchedulePeriods,
  getScheduleMonth,
  saveShift,
  deleteShift,
  publishSchedulePeriod,
  type SchedulePeriod,
  type ScheduleEmployee,
  type ScheduleShift,
  type Identity,
} from '../api/gasClient'

interface Props {
  identity: Identity
}

// Preset shift types (5 business-defined types)
const SHIFT_PRESETS = [
  { type: 'opening', label: 'Открытие', start: '09:30' },
  { type: 'shift_10', label: '10:00', start: '10:00' },
  { type: 'shift_11', label: '11:00', start: '11:00' },
  { type: 'shift_12', label: '12:00', start: '12:00' },
  { type: 'replacement', label: 'Замена', start: '' },
]

const MONTH_NAMES = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
const DAY_SHORT = ['вс','пн','вт','ср','чт','пт','сб']

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return full
  return parts[0] + ' ' + parts.slice(1).map(p => p[0] + '.').join('')
}

function datesInRange(from: string, to: string): string[] {
  const dates: string[] = []
  const d = new Date(from)
  const end = new Date(to)
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function dayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return String(d.getDate()).padStart(2, '0') + ' ' + DAY_SHORT[d.getDay()]
}

// ─── Главный компонент ScheduleTab ────────────────────────────────────────────

export default function ScheduleTab({ identity }: Props) {
  const [periods, setPeriods] = useState<SchedulePeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<SchedulePeriod | null>(null)
  const [viewMode, setViewMode] = useState<'draft' | 'published'>('draft')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getSchedulePeriods()
      setPeriods(res.periods)
      // По умолчанию показываем черновик (планируемый) если есть, иначе опубликованный
      const draft = res.periods.find(p => p.status === 'draft')
      const published = res.periods.find(p => p.status === 'published')
      setActivePeriod(draft || published || res.periods[0] || null)
      setViewMode(draft ? 'draft' : 'published')
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!activePeriod) return <p className="text-center text-gray-400 py-12">Периодов расписания нет</p>

  const draftPeriod = periods.find(p => p.status === 'draft')
  const publishedPeriod = periods.find(p => p.status === 'published')
  const displayPeriod = viewMode === 'draft' ? draftPeriod : publishedPeriod

  return (
    <div className="flex flex-col h-full">
      {/* Period tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        {publishedPeriod && (
          <PeriodTab
            label={'Текущий'}
            sub={publishedPeriod.period_name}
            active={viewMode === 'published'}
            onClick={() => setViewMode('published')}
          />
        )}
        {draftPeriod && (
          <PeriodTab
            label={'Планируемый'}
            sub={draftPeriod.period_name}
            active={viewMode === 'draft'}
            onClick={() => setViewMode('draft')}
          />
        )}
      </div>

      {displayPeriod ? (
        <MatrixView
          identity={identity}
          period={displayPeriod}
          onPublished={load}
        />
      ) : (
        <p className="text-center text-gray-400 py-12">
          {viewMode === 'draft' ? 'Черновик не найден' : 'Опубликованного расписания нет'}
        </p>
      )}
    </div>
  )
}

function PeriodTab({ label, sub, active, onClick }: { label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-center transition-colors ${active ? 'border-b-2 border-blue-600' : ''}`}
    >
      <p className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-[10px] ${active ? 'text-blue-400' : 'text-gray-400'}`}>{sub}</p>
    </button>
  )
}

// ─── Матричное представление ─────────────────────────────────────────────────

interface MatrixViewProps {
  identity: Identity
  period: SchedulePeriod
  onPublished: () => void
}

function MatrixView({ identity, period, onPublished }: MatrixViewProps) {
  const [employees, setEmployees] = useState<ScheduleEmployee[]>([])
  const [shifts, setShifts] = useState<ScheduleShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editCell, setEditCell] = useState<{ date: string; employee: ScheduleEmployee; shift: ScheduleShift | null } | null>(null)
  const [publishing, setPublishing] = useState(false)

  const storeId = identity.store_id

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getScheduleMonth(storeId, period.schedule_period_id)
      setEmployees(res.employees)
      setShifts(res.shifts)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [storeId, period.schedule_period_id])

  useEffect(() => { load() }, [load])

  const handlePublish = async () => {
    if (!confirm('Опубликовать расписание «' + period.period_name + '»?')) return
    setPublishing(true)
    try {
      await publishSchedulePeriod(period.schedule_period_id)
      onPublished()
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e))
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />

  const isDraft = period.status === 'draft'
  const dates = datesInRange(period.date_from, period.date_to)

  // Build lookup: date → employee_id → shift
  const shiftMap: Record<string, Record<string, ScheduleShift>> = {}
  shifts.forEach(s => {
    if (!shiftMap[s.shift_date]) shiftMap[s.shift_date] = {}
    shiftMap[s.shift_date][s.employee_id] = s
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{period.period_name}</p>
          <p className="text-xs text-gray-400">{employees.length} сотр. · {shifts.length} смен</p>
        </div>
        {isDraft && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {publishing ? '...' : 'Опубликовать'}
          </button>
        )}
        {!isDraft && (
          <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium">Опубликовано</span>
        )}
      </div>

      {/* Matrix table — horizontally scrollable */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs min-w-max">
          <thead>
            <tr className="sticky top-0 bg-gray-50 z-10">
              <th className="sticky left-0 bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-500 border-b border-r border-gray-200 min-w-[52px]">
                Дата
              </th>
              {employees.map(emp => (
                <th
                  key={emp.employee_id}
                  className="px-1.5 py-1.5 text-center font-medium text-gray-600 border-b border-gray-200 min-w-[62px] max-w-[72px]"
                >
                  <span className="block truncate leading-tight">{shortName(emp.full_name)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date, i) => {
              const d = new Date(date + 'T00:00:00')
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              return (
                <tr key={date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className={`sticky left-0 px-2 py-1.5 font-medium border-r border-b border-gray-100 whitespace-nowrap ${isWeekend ? 'bg-orange-50 text-orange-700' : (i % 2 === 0 ? 'bg-white text-gray-700' : 'bg-gray-50 text-gray-700')}`}>
                    {dayLabel(date)}
                  </td>
                  {employees.map(emp => {
                    const shift = shiftMap[date]?.[emp.employee_id] ?? null
                    return (
                      <td
                        key={emp.employee_id}
                        onClick={() => isDraft && setEditCell({ date, employee: emp, shift })}
                        className={`px-1 py-1.5 text-center border-b border-gray-100 ${isDraft ? 'cursor-pointer active:bg-blue-50' : ''}`}
                      >
                        {shift ? (
                          <span className="text-gray-800 leading-tight block">
                            {shift.planned_start_time.slice(0, 5)}
                            <br />
                            <span className="text-gray-400">{shift.planned_end_time.slice(0, 5)}</span>
                          </span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editCell && (
        <ShiftEditModal
          periodId={period.schedule_period_id}
          storeId={storeId}
          cell={editCell}
          onClose={() => setEditCell(null)}
          onSaved={() => { setEditCell(null); load() }}
          onDeleted={() => { setEditCell(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Модальное окно редактирования смены ─────────────────────────────────────

interface EditModalProps {
  periodId: string
  storeId: string
  cell: { date: string; employee: ScheduleEmployee; shift: ScheduleShift | null }
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function ShiftEditModal({ periodId, storeId, cell, onClose, onSaved, onDeleted }: EditModalProps) {
  const [startTime, setStartTime] = useState(cell.shift?.planned_start_time.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(cell.shift?.planned_end_time.slice(0, 5) ?? '')
  const [shiftType, setShiftType] = useState(cell.shift?.shift_type ?? 'regular')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [, m, d] = cell.date.split('-').map(Number)
  const dateLabel = `${d} ${MONTH_NAMES[m - 1]}`

  const applyPreset = (preset: typeof SHIFT_PRESETS[number]) => {
    setShiftType(preset.type)
    if (preset.start) setStartTime(preset.start)
  }

  const handleSave = async () => {
    if (!startTime || !endTime) { alert('Укажи время начала и конца смены'); return }
    setSaving(true)
    try {
      await saveShift({
        schedule_shift_id: cell.shift?.schedule_shift_id,
        schedule_period_id: periodId,
        store_id: storeId,
        employee_id: cell.employee.employee_id,
        shift_date: cell.date,
        planned_start_time: startTime,
        planned_end_time: endTime,
        shift_type: shiftType,
      })
      onSaved()
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!cell.shift) return
    if (!confirm('Удалить смену?')) return
    setDeleting(true)
    try {
      await deleteShift(cell.shift.schedule_shift_id)
      onDeleted()
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 bg-black/40 z-50 flex items-end"
    >
      <div className="w-full bg-white rounded-t-2xl p-4 pb-safe-bottom space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{shortName(cell.employee.full_name)}</p>
            <p className="text-xs text-gray-500">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        {/* Preset buttons */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Тип смены:</p>
          <div className="flex flex-wrap gap-1.5">
            {SHIFT_PRESETS.map(p => (
              <button
                key={p.type}
                onClick={() => applyPreset(p)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${shiftType === p.type ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Приход</span>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Уход</span>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : cell.shift ? 'Сохранить' : 'Добавить'}
          </button>
          {cell.shift && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="py-2.5 px-4 border border-red-200 text-red-500 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {deleting ? '...' : 'Удалить'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-2">
      <p>{message}</p>
      <button onClick={onRetry} className="text-red-600 font-medium underline">Попробовать снова</button>
    </div>
  )
}
