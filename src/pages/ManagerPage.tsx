import { useEffect, useState, useCallback } from 'react'
import { getDashboard, getReviewQueue, type DashboardShiftRow, type DashboardSummary, type IssueRow, type Identity } from '../api/gasClient'
import StatusBadge from '../components/StatusBadge'
import ScheduleTab from './ScheduleTab'

interface ManagerPageProps {
  identity: Identity
  onLogout: () => void
}

type Tab = 'today' | 'reviews' | 'schedule'

const STATUS_LABELS: Record<string, string> = {
  planned: 'Запланирована',
  in_progress: 'На смене',
  attended: 'Смена закрыта',
  late: 'Опоздание',
  needs_review: 'Нужна проверка',
}

export default function ManagerPage({ identity, onLogout }: ManagerPageProps) {
  const [tab, setTab] = useState<Tab>('today')

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      {/* Шапка */}
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="font-bold text-gray-900">{identity.full_name}</h1>
            <p className="text-xs text-gray-500">
              {identity.app_role === 'store_manager' ? 'Менеджер магазина' : 'Офис'}
            </p>
          </div>
          <button onClick={onLogout} className="text-xs text-gray-400 active:text-gray-600">
            Выйти
          </button>
        </div>
        {/* Табы */}
        <div className="flex border-b border-gray-100">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>Сегодня</TabButton>
          <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')}>Расписание</TabButton>
          <TabButton active={tab === 'reviews'} onClick={() => setTab('reviews')}>Проверки</TabButton>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {tab === 'today' && <div className="flex-1 overflow-y-auto"><TodayTab /></div>}
        {tab === 'schedule' && <ScheduleTab identity={identity} />}
        {tab === 'reviews' && <div className="flex-1 overflow-y-auto"><ReviewsTab /></div>}
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
  const [shifts, setShifts] = useState<DashboardShiftRow[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getDashboard()
      setShifts(result.shifts)
      setSummary(result.summary)
      setDate(result.date)
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
    <div className="p-4 space-y-4">
      {/* Дата */}
      {date && <p className="text-sm text-gray-500 font-medium">{formatDateRu(date)}</p>}

      {/* Сводка */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <SummaryChip label="Всего" value={summary.total} color="text-gray-700" />
          <SummaryChip label="На смене" value={summary.in_progress} color="text-blue-600" />
          <SummaryChip label="Опозд." value={summary.late} color="text-yellow-600" />
          <SummaryChip label="Пришли" value={summary.attended} color="text-green-600" />
          <SummaryChip label="Проверка" value={summary.needs_review} color="text-red-600" />
          <SummaryChip label="План" value={summary.planned} color="text-gray-400" />
        </div>
      )}

      {/* Список смен */}
      {shifts.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Смен нет</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <div
              key={shift.schedule_shift_id}
              className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{shift.employee_name}</p>
                <p className="text-xs text-gray-500">{shift.planned_start_time}–{shift.planned_end_time}</p>
                {shift.check_in_time && (
                  <p className="text-xs text-green-600">↓ {shift.check_in_time}{shift.check_out_time ? ` · ↑ ${shift.check_out_time}` : ''}</p>
                )}
              </div>
              <StatusBadge status={shift.shift_status} label={STATUS_LABELS[shift.shift_status] ?? shift.shift_status} />
            </div>
          ))}
        </div>
      )}

      <button onClick={load} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 active:bg-gray-50">
        Обновить
      </button>
    </div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-2.5 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

// ─── Вкладка «Проверки» ────────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, string> = {
  missing_check_in: 'Нет прихода',
  missing_check_out: 'Нет ухода',
  outside_radius_review: 'Вне радиуса',
  late: 'Опоздание',
  needs_manual_review: 'Ручная проверка',
}

const ISSUE_STATUS_LABELS: Record<string, string> = {
  needs_review: 'На проверке',
  open: 'Открыто',
  escalated: 'Эскалировано',
}

function ReviewsTab() {
  const [issues, setIssues] = useState<IssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getReviewQueue()
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
          <p className="text-gray-500">Нет открытых нарушений</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">Открытых нарушений: <strong>{issues.length}</strong></p>
          {issues.map((issue) => (
            <div key={issue.issue_id || issue.issue_external_key} className="bg-white rounded-xl border border-gray-100 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm text-gray-900 truncate">{issue.employee_name}</p>
                <span className="text-xs text-orange-600 font-medium whitespace-nowrap">
                  {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{issue.store_name} · {issue.issue_date}</p>
                <span className="text-xs text-gray-400">{ISSUE_STATUS_LABELS[issue.status] ?? issue.status}</span>
              </div>
            </div>
          ))}
        </>
      )}

      <button onClick={load} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 active:bg-gray-50">
        Обновить
      </button>
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
