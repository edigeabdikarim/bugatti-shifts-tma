import { useEffect, useState, useCallback } from 'react'
import {
  getTodayShifts,
  getMySchedule,
  getMyIssues,
  addIssueComment,
  type ShiftRow,
  type MyShiftRow,
  type MyIssueRow,
  type Identity,
} from '../api/gasClient'
import TodayShiftCard from '../components/TodayShiftCard'

interface EmployeePageProps {
  identity: Identity
  onLogout: () => void
}

type Tab = 'today' | 'schedule' | 'issues'

const MONTH_NAMES = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
const DAY_SHORT = ['вс','пн','вт','ср','чт','пт','сб']

export default function EmployeePage({ identity, onLogout }: EmployeePageProps) {
  const [tab, setTab] = useState<Tab>('today')

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="font-bold text-gray-900">{identity.full_name}</h1>
            <p className="text-xs text-gray-500">Сотрудник</p>
          </div>
          <button onClick={onLogout} className="text-xs text-gray-400 active:text-gray-600">
            Выйти
          </button>
        </div>
        <div className="flex border-b border-gray-100">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>Сегодня</TabButton>
          <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')}>Расписание</TabButton>
          <TabButton active={tab === 'issues'} onClick={() => setTab('issues')}>Нарушения</TabButton>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === 'today' && <TodayTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'issues' && <IssuesTab />}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Вкладка «Сегодня» ─────────────────────────────────────────────────────

function TodayTab() {
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
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

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />

  return (
    <div className="p-4 space-y-3">
      {date && <p className="text-sm text-gray-500 font-medium">{formatDateRu(date)}</p>}

      {shifts.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">😴</p>
          <p className="text-gray-500">{message || 'Сегодня смен нет'}</p>
        </div>
      ) : (
        shifts.map((shift) => (
          <TodayShiftCard
            key={shift.schedule_shift_id}
            shift={shift}
            onEventRecorded={load}
          />
        ))
      )}

      <button
        onClick={load}
        className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 active:bg-gray-50"
      >
        Обновить
      </button>
    </div>
  )
}

// ─── Вкладка «Расписание» ───────────────────────────────────────────────────

function ScheduleTab() {
  const now = new Date()
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [shifts, setShifts] = useState<MyShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (m: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await getMySchedule(m)
      setShifts(result.shifts)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(month) }, [load, month])

  function prevMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function nextMonth() {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const [y, m] = month.split('-').map(Number)
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={() => load(month)} />

  return (
    <div className="p-4 space-y-3">
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 text-gray-500 active:text-gray-800">‹</button>
        <p className="text-sm font-semibold text-gray-800 capitalize">{monthLabel}</p>
        <button onClick={nextMonth} className="p-2 text-gray-500 active:text-gray-800">›</button>
      </div>

      {shifts.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-3xl">📅</p>
          <p className="text-gray-400 text-sm">Смен в этом месяце нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const d = new Date(shift.shift_date + 'T00:00:00')
            const isWeekend = d.getDay() === 0 || d.getDay() === 6
            const dayNum = d.getDate()
            const dayName = DAY_SHORT[d.getDay()]
            return (
              <div
                key={shift.schedule_shift_id}
                className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3"
              >
                <div className={`w-10 text-center shrink-0 ${isWeekend ? 'text-orange-600' : 'text-gray-700'}`}>
                  <p className="text-lg font-bold leading-tight">{dayNum}</p>
                  <p className="text-[10px] uppercase">{dayName}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">
                    {shift.planned_start_time}–{shift.planned_end_time}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{shift.store_name}</p>
                </div>
                <ShiftStatusBadge status={shift.shift_status} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ShiftStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    planned: { label: 'Ждёт', cls: 'bg-gray-100 text-gray-500' },
    in_progress: { label: 'На смене', cls: 'bg-blue-50 text-blue-600' },
    attended: { label: 'Закрыта', cls: 'bg-green-50 text-green-700' },
    late: { label: 'Опоздание', cls: 'bg-yellow-50 text-yellow-700' },
    needs_review: { label: 'Проверка', cls: 'bg-red-50 text-red-600' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

// ─── Вкладка «Нарушения» ────────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, string> = {
  missing_check_in: 'Нет прихода',
  missing_check_out: 'Нет ухода',
  outside_radius_review: 'Вне радиуса',
  late: 'Опоздание',
  needs_manual_review: 'Ручная проверка',
}

const ISSUE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  needs_review: { label: 'На проверке', cls: 'text-orange-600' },
  open: { label: 'Открыто', cls: 'text-orange-600' },
  escalated: { label: 'Эскалировано', cls: 'text-red-600' },
  resolved: { label: 'Разрешено', cls: 'text-green-600' },
  confirmed_violation: { label: 'Нарушение', cls: 'text-red-600' },
}

function IssuesTab() {
  const [issues, setIssues] = useState<MyIssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getMyIssues()
      setIssues(result.issues)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />

  return (
    <div className="p-4 space-y-3">
      {issues.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">✅</p>
          <p className="text-gray-500">Нарушений нет</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">Всего нарушений: <strong>{issues.length}</strong></p>
          {issues.map((issue) => (
            <IssueCard key={issue.issue_id} issue={issue} onCommented={load} />
          ))}
        </>
      )}
    </div>
  )
}

function IssueCard({ issue, onCommented }: { issue: MyIssueRow; onCommented: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState(issue.employee_comment)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const isOpen = ['needs_review', 'open', 'escalated'].includes(issue.status)
  const statusInfo = ISSUE_STATUS_LABELS[issue.status] ?? { label: issue.status, cls: 'text-gray-500' }

  async function handleSave() {
    if (!comment.trim()) { setErr('Введи комментарий'); return }
    setSaving(true)
    setErr('')
    try {
      await addIssueComment(issue.issue_id, comment)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onCommented()
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-3 text-left active:bg-gray-50"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">
            {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
          </p>
          <span className={`text-xs font-medium ${statusInfo.cls}`}>{statusInfo.label}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{issue.store_name} · {issue.issue_date}</p>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-2">
          {issue.resolution_comment && (
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
              <p className="text-gray-400 font-medium mb-0.5">Решение:</p>
              <p>{issue.resolution_comment}</p>
            </div>
          )}
          {isOpen && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Добавь комментарий к нарушению…"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-400"
              />
              {err && <p className="text-xs text-red-500">{err}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {saving ? 'Отправка…' : saved ? 'Сохранено ✓' : 'Отправить комментарий'}
              </button>
            </>
          )}
          {!isOpen && issue.employee_comment && (
            <div className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-700">
              <p className="text-blue-400 font-medium mb-0.5">Мой комментарий:</p>
              <p>{issue.employee_comment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Утилиты ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
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

function formatDateRu(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
}
