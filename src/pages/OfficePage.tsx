import { useEffect, useState, useCallback } from 'react'
import {
  getDashboard,
  getReviewQueue,
  resolveIssue,
  getEmployeesList,
  getStores,
  getIssuesSummary,
  assignStoreManager,
  removeStoreManager,
  type DashboardShiftRow,
  type DashboardSummary,
  type IssueRow,
  type EmployeeRow,
  type Identity,
  type StoreInfo,
  type IssueSummaryResult,
} from '../api/gasClient'
import StatusBadge from '../components/StatusBadge'

interface OfficePageProps {
  identity: Identity
  onLogout: () => void
}

type Tab = 'issues' | 'today' | 'employees' | 'report'

const ROLE_LABEL: Record<string, string> = {
  office: 'Офис',
  admin: 'Супер-администратор',
}

export default function OfficePage({ identity, onLogout }: OfficePageProps) {
  const [tab, setTab] = useState<Tab>('issues')

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 pt-safe-top pb-0 sticky top-0 z-10">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="font-bold text-gray-900">{identity.full_name}</h1>
            <p className="text-xs text-gray-500">{ROLE_LABEL[identity.role] ?? identity.app_role}</p>
          </div>
          <button onClick={onLogout} className="text-xs text-gray-400 active:text-gray-600">
            Выйти
          </button>
        </div>
        <div className="flex border-b border-gray-100">
          <TabButton active={tab === 'issues'} onClick={() => setTab('issues')}>Нарушения</TabButton>
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>Отметки</TabButton>
          <TabButton active={tab === 'employees'} onClick={() => setTab('employees')}>Сотрудники</TabButton>
          <TabButton active={tab === 'report'} onClick={() => setTab('report')}>Отчёт</TabButton>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {tab === 'issues' && <div className="flex-1 overflow-y-auto"><IssuesTab /></div>}
        {tab === 'today' && <div className="flex-1 overflow-y-auto"><TodayTab /></div>}
        {tab === 'employees' && <div className="flex-1 overflow-y-auto"><EmployeesTab identity={identity} /></div>}
        {tab === 'report' && <div className="flex-1 overflow-y-auto"><ReportTab /></div>}
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

// ─── Вкладка «Нарушения» ───────────────────────────────────────────────────

const ISSUE_TYPE_LABELS: Record<string, string> = {
  missing_check_in: 'Нет прихода',
  missing_check_out: 'Нет ухода',
  outside_radius_review: 'Вне радиуса',
  late: 'Опоздание',
  needs_manual_review: 'Ручная проверка',
}

function IssuesTab() {
  const [issues, setIssues] = useState<IssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState<string | null>(null)

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
          <p className="text-gray-500">Открытых нарушений нет</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">Открытых нарушений: <strong>{issues.length}</strong></p>
          {issues.map((issue) => (
            <IssueCard
              key={issue.issue_id || issue.issue_external_key}
              issue={issue}
              resolving={resolving === issue.issue_id}
              onResolve={async (decision, comment) => {
                setResolving(issue.issue_id)
                try {
                  await resolveIssue(issue.issue_id, decision, comment)
                  await load()
                } catch (err) {
                  setError(String(err instanceof Error ? err.message : err))
                } finally {
                  setResolving(null)
                }
              }}
            />
          ))}
        </>
      )}
      <button onClick={load} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 active:bg-gray-50">
        Обновить
      </button>
    </div>
  )
}

function IssueCard({
  issue,
  resolving,
  onResolve,
}: {
  issue: IssueRow
  resolving: boolean
  onResolve: (decision: 'resolved' | 'violation', comment: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')

  function handleDecision(decision: 'resolved' | 'violation') {
    if (!comment.trim()) {
      setCommentError('Комментарий обязателен')
      return
    }
    setCommentError('')
    onResolve(decision, comment)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-3 text-left space-y-1.5 active:bg-gray-50"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm text-gray-900 truncate">{issue.employee_name}</p>
          <span className="text-xs text-orange-600 font-medium whitespace-nowrap">
            {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
          </span>
        </div>
        <p className="text-xs text-gray-500">{issue.store_name} · {issue.issue_date}</p>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий (обязательно)"
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-400"
          />
          {commentError && <p className="text-xs text-red-500">{commentError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => handleDecision('resolved')}
              disabled={resolving}
              className="flex-1 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg active:bg-green-100 disabled:opacity-50"
            >
              {resolving ? '...' : 'Разрешено'}
            </button>
            <button
              onClick={() => handleDecision('violation')}
              disabled={resolving}
              className="flex-1 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg active:bg-red-100 disabled:opacity-50"
            >
              {resolving ? '...' : 'Нарушение'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Вкладка «Отметки» ─────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  planned: 'Запланирована',
  in_progress: 'На смене',
  attended: 'Смена закрыта',
  late: 'Опоздание',
  needs_review: 'Нужна проверка',
}

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
      {date && <p className="text-sm text-gray-500 font-medium">{formatDateRu(date)}</p>}

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

      {shifts.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Смен нет</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <div key={shift.schedule_shift_id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{shift.employee_name}</p>
                <p className="text-xs text-gray-500">{shift.store_name} · {shift.planned_start_time}–{shift.planned_end_time}</p>
                {shift.check_in_time && (
                  <p className="text-xs text-green-600">&#8595; {shift.check_in_time}{shift.check_out_time ? ` · &#8593; ${shift.check_out_time}` : ''}</p>
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

// ─── Вкладка «Сотрудники» ──────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  store_manager: 'Менеджер',
  office_controller: 'Офис',
  super_admin: 'Супер-адм.',
}

function EmployeesTab({ identity }: { identity: Identity }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [empResult, storeResult] = await Promise.all([getEmployeesList(), getStores()])
      setEmployees(empResult.employees)
      setStores(storeResult.stores)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = employees.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.full_name.toLowerCase().includes(q) || e.store_name.toLowerCase().includes(q)
  })

  async function handleAssignManager(employeeId: string, storeId: string) {
    setActionLoading(true)
    setActionError('')
    try {
      await assignStoreManager(employeeId, storeId)
      await load()
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveManager(employeeId: string, storeId: string) {
    setActionLoading(true)
    setActionError('')
    try {
      await removeStoreManager(employeeId, storeId)
      await load()
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />

  return (
    <div className="p-4 space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по имени или магазину"
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-400 bg-white"
      />

      <p className="text-xs text-gray-400">{filtered.length} из {employees.length}</p>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{actionError}</div>
      )}

      <div className="space-y-2">
        {filtered.map((emp) => (
          <EmployeeCard
            key={emp.employee_id}
            emp={emp}
            stores={stores}
            identity={identity}
            expanded={expandedId === emp.employee_id}
            onToggle={() => setExpandedId(expandedId === emp.employee_id ? null : emp.employee_id)}
            actionLoading={actionLoading}
            onAssign={handleAssignManager}
            onRemove={handleRemoveManager}
          />
        ))}
      </div>
    </div>
  )
}

function EmployeeCard({
  emp,
  stores,
  identity,
  expanded,
  onToggle,
  actionLoading,
  onAssign,
  onRemove,
}: {
  emp: EmployeeRow
  stores: StoreInfo[]
  identity: Identity
  expanded: boolean
  onToggle: () => void
  actionLoading: boolean
  onAssign: (employeeId: string, storeId: string) => void
  onRemove: (employeeId: string, storeId: string) => void
}) {
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const isManager = emp.role === 'store_manager'
  const canManageManagers = identity.role === 'admin' || identity.role === 'office'

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full p-3 text-left active:bg-gray-50">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm text-gray-900 truncate">{emp.full_name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {ROLE_BADGE[emp.role] && (
              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium">
                {ROLE_BADGE[emp.role]}
              </span>
            )}
            {!emp.is_active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Уволен</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">{emp.store_name}{emp.phone ? ` · ${emp.phone}` : ''}</p>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Роль:</span>{' '}
              <span className="text-gray-700">{ROLE_BADGE[emp.role] ?? 'Сотрудник'}</span>
            </div>
            <div>
              <span className="text-gray-400">Статус:</span>{' '}
              <span className={emp.is_active ? 'text-green-600' : 'text-gray-500'}>
                {emp.is_active ? 'Активен' : 'Уволен'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Магазин:</span>{' '}
              <span className="text-gray-700">{emp.store_name}</span>
            </div>
            {emp.identity_status && (
              <div>
                <span className="text-gray-400">Telegram:</span>{' '}
                <span className="text-gray-700">{emp.identity_status === 'active' ? 'Привязан' : emp.identity_status}</span>
              </div>
            )}
          </div>

          {canManageManagers && emp.is_active && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-gray-500">Управление ролью</p>

              {isManager && (
                <button
                  onClick={() => onRemove(emp.employee_id, emp.home_store_id)}
                  disabled={actionLoading}
                  className="w-full py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg active:bg-red-100 disabled:opacity-50"
                >
                  {actionLoading ? '...' : `Снять менеджера (${emp.store_name})`}
                </button>
              )}

              {!isManager && (
                <div className="space-y-2">
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Выбрать магазин...</option>
                    {stores.map((s) => (
                      <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => selectedStoreId && onAssign(emp.employee_id, selectedStoreId)}
                    disabled={actionLoading || !selectedStoreId}
                    className="w-full py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg active:bg-blue-100 disabled:opacity-50"
                  >
                    {actionLoading ? '...' : 'Назначить менеджером'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Вкладка «Отчёт» ───────────────────────────────────────────────────────

function ReportTab() {
  const [data, setData] = useState<IssueSummaryResult | null>(null)
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [storeFilter, setStoreFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [result, storeResult] = await Promise.all([
        getIssuesSummary(month, storeFilter),
        getStores(),
      ])
      setData(result)
      setStores(storeResult.stores)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
    } finally {
      setLoading(false)
    }
  }, [month, storeFilter])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorBlock message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 bg-white"
        >
          <option value="">Все магазины</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <p className="text-3xl font-bold text-gray-900">{data.total_issues}</p>
        <p className="text-xs text-gray-400 mt-1">Нарушений за {formatMonthRu(data.month)}</p>
      </div>

      {data.by_store.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">По магазинам</p>
          {data.by_store.map((s) => (
            <div key={s.store_id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
              <p className="text-sm text-gray-900">{s.store_name}</p>
              <span className="text-sm font-bold text-gray-700">{s.total}</span>
            </div>
          ))}
        </div>
      )}

      {data.by_employee.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">По сотрудникам</p>
          {data.by_employee.map((e) => (
            <div key={e.employee_id} className="bg-white rounded-xl border border-gray-100 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">{e.employee_name}</p>
                <span className="text-sm font-bold text-gray-700">{e.total}</span>
              </div>
              <p className="text-xs text-gray-500">{e.store_name}</p>
              <div className="flex gap-3 text-xs">
                <span className="text-yellow-600">Открыто: {e.open}</span>
                <span className="text-green-600">Решено: {e.resolved}</span>
                <span className="text-red-600">Нарушения: {e.confirmed_violation}</span>
              </div>
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

function formatMonthRu(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}
