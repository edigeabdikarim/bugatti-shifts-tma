/**
 * Клиент для Google Apps Script Web App API.
 * Все запросы — POST с JSON телом, action в теле.
 */

import { getInitData } from '../hooks/useTelegram'

const GAS_URL = import.meta.env.VITE_GAS_API_URL as string

if (!GAS_URL) {
  console.warn('[gasClient] VITE_GAS_API_URL не задан! Создай .env.local из .env.example')
}

// ─── Типы ──────────────────────────────────────────────────────────────────

export interface Identity {
  employee_id: string
  full_name: string
  store_id: string
  role: 'employee' | 'manager' | 'office' | 'admin'
  app_role: string
  is_active: boolean
}

export interface ShiftRow {
  schedule_shift_id: string
  shift_date: string
  store_id: string
  store_name: string
  store_code: string
  planned_start_time: string
  planned_end_time: string
  shift_status: 'planned' | 'in_progress' | 'attended' | 'late' | 'needs_review'
  shift_status_label: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_geo_status: string | null
  can_check_in: boolean
  can_check_out: boolean
}

export interface CheckEventResult {
  ok: boolean
  event_type: string
  event_time: string
  geo_status: string
  geo_message: string
  shift_id: string
}

export interface DashboardSummary {
  total: number
  planned: number
  in_progress: number
  attended: number
  late: number
  needs_review: number
}

export interface DashboardShiftRow {
  schedule_shift_id: string
  employee_name: string
  store_name: string
  planned_start_time: string
  planned_end_time: string
  shift_status: string
  shift_status_label: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_geo_status: string | null
}

export interface IssueRow {
  issue_id: string
  issue_external_key: string
  employee_name: string
  store_name: string
  issue_date: string
  issue_type: string
  status: string
}

export interface SchedulePeriod {
  schedule_period_id: string
  period_name: string
  date_from: string
  date_to: string
  status: 'draft' | 'published' | 'closed'
}

export interface ScheduleEmployee {
  employee_id: string
  full_name: string
}

export interface ScheduleShift {
  schedule_shift_id: string
  employee_id: string
  shift_date: string
  planned_start_time: string
  planned_end_time: string
  shift_type: string
  shift_status: string
  comments: string
  replacement_for_employee_id: string
}

export interface ScheduleMonthResult {
  ok: boolean
  period: SchedulePeriod
  store_id: string
  employees: ScheduleEmployee[]
  shifts: ScheduleShift[]
}

export interface CheckLinkResult {
  ok: boolean
  status: 'not_found' | 'pending_info' | 'pending_approval' | 'active' | 'rejected' | 'dismissed'
  identity?: Identity
  full_name?: string
}

export interface MyShiftRow {
  schedule_shift_id: string
  shift_date: string
  store_id: string
  store_name: string
  planned_start_time: string
  planned_end_time: string
  shift_type: string
  shift_status: string
}

export interface MyIssueRow {
  issue_id: string
  issue_date: string
  issue_type: string
  status: string
  store_name: string
  resolution_comment: string
  employee_comment: string
}

export interface IssueSummaryRow {
  employee_id: string
  employee_name: string
  store_name: string
  total: number
  open: number
  resolved: number
  confirmed_violation: number
}

export interface StoreSummaryRow {
  store_id: string
  store_name: string
  total: number
}

export interface IssueSummaryResult {
  ok: boolean
  month: string
  total_issues: number
  by_employee: IssueSummaryRow[]
  by_store: StoreSummaryRow[]
}

export interface StoreInfo {
  store_id: string
  store_name: string
  store_code: string
  city: string
}

export interface EmployeeRow {
  employee_id: string
  full_name: string
  phone: string
  role: string
  home_store_id: string
  store_name: string
  is_active: boolean
  identity_status: string
}

// ─── Внутренняя функция запроса ────────────────────────────────────────────

async function post<T>(action: string, extra?: Record<string, unknown>): Promise<T> {
  const initData = getInitData()
  const body = JSON.stringify({ action, telegram_init_data: initData, ...extra })

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // GAS не поддерживает application/json из браузера (CORS)
    body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json() as { ok: boolean; error?: string } & T
  if (!data.ok && data.error) {
    throw new Error(data.error)
  }

  return data
}

// ─── Публичное API ─────────────────────────────────────────────────────────

/** Проверить статус привязки по telegram_chat_id из initData */
export async function checkLink(): Promise<CheckLinkResult> {
  return post('check_link')
}

/** Получить список активных магазинов (для формы регистрации) */
export async function getStores(): Promise<{ ok: boolean; stores: StoreInfo[] }> {
  return post('get_stores')
}

/** Отправить заявку на регистрацию нового сотрудника */
export async function submitRegistration(
  fullName: string,
  storeId: string,
): Promise<{ ok: boolean; status: string }> {
  return post('submit_registration', { full_name: fullName, store_id: storeId })
}

/** Привязать Telegram аккаунт к коду сотрудника */
export async function linkAccount(employeeCode: string): Promise<{ ok: boolean; identity: Identity }> {
  return post('link_account', { employee_code: employeeCode })
}

/** Получить смены сотрудника на сегодня */
export async function getTodayShifts(): Promise<{ ok: boolean; shifts: ShiftRow[]; date: string; message?: string }> {
  return post('get_today_shifts')
}

/** Зафиксировать приход (check-in) с геолокацией */
export async function checkIn(lat: number, lon: number): Promise<CheckEventResult> {
  return post('check_in', { lat, lon, timestamp: new Date().toISOString() })
}

/** Зафиксировать уход (check-out) с геолокацией */
export async function checkOut(lat: number, lon: number): Promise<CheckEventResult> {
  return post('check_out', { lat, lon, timestamp: new Date().toISOString() })
}

/** Получить менеджерский дашборд */
export async function getDashboard(): Promise<{
  ok: boolean
  date: string
  summary: DashboardSummary
  shifts: DashboardShiftRow[]
}> {
  return post('get_dashboard')
}

/** Получить очередь нарушений (для менеджера) */
export async function getReviewQueue(): Promise<{ ok: boolean; issues: IssueRow[]; total: number }> {
  return post('get_review_queue')
}

/** Получить список периодов расписания */
export async function getSchedulePeriods(): Promise<{ ok: boolean; periods: SchedulePeriod[] }> {
  return post('get_schedule_periods')
}

/** Получить месячную матрицу расписания */
export async function getScheduleMonth(storeId: string, periodId?: string): Promise<ScheduleMonthResult> {
  return post('get_schedule_month', { store_id: storeId, period_id: periodId || '' })
}

/** Сохранить смену (создать или обновить) */
export async function saveShift(shift: {
  schedule_shift_id?: string
  schedule_period_id: string
  store_id: string
  employee_id: string
  shift_date: string
  planned_start_time: string
  planned_end_time: string
  shift_type?: string
  comments?: string
}): Promise<{ ok: boolean; schedule_shift_id: string; action: string }> {
  return post('save_shift', { shift })
}

/** Удалить смену */
export async function deleteShift(shiftId: string): Promise<{ ok: boolean; action: string }> {
  return post('delete_shift', { shift_id: shiftId })
}

/** Опубликовать период (draft → published) */
export async function publishSchedulePeriod(periodId: string): Promise<{ ok: boolean; period_id: string; status: string }> {
  return post('publish_schedule_period', { period_id: periodId })
}

/** Принять решение по нарушению (office / admin) */
export async function resolveIssue(
  issueId: string,
  decision: 'resolved' | 'violation',
  comment: string,
): Promise<{ ok: boolean; issue_id: string; status: string }> {
  return post('resolve_issue', { issue_id: issueId, decision, comment })
}

/** Получить список сотрудников (office / admin) */
export async function getEmployeesList(storeId?: string): Promise<{ ok: boolean; employees: EmployeeRow[]; total: number }> {
  return post('get_employees_list', { store_id: storeId || '' })
}

/** Сводный отчёт по нарушениям за месяц (office / admin) */
export async function getIssuesSummary(month?: string, storeId?: string): Promise<IssueSummaryResult> {
  return post('get_issues_summary', { month: month || '', store_id: storeId || '' })
}

/** Назначить сотрудника менеджером магазина (office / admin) */
export async function assignStoreManager(employeeId: string, storeId: string): Promise<{ ok: boolean; employee_id: string; action: string }> {
  return post('assign_store_manager', { employee_id: employeeId, store_id: storeId })
}

/** Снять менеджера с магазина (office / admin) */
export async function removeStoreManager(employeeId: string, storeId: string): Promise<{ ok: boolean; employee_id: string; action: string }> {
  return post('remove_store_manager', { employee_id: employeeId, store_id: storeId })
}

/** Получить смены сотрудника за месяц (YYYY-MM, default: текущий) */
export async function getMySchedule(month?: string): Promise<{ ok: boolean; shifts: MyShiftRow[]; month: string }> {
  return post('get_my_schedule', { month: month || '' })
}

/** Получить нарушения сотрудника (все статусы) */
export async function getMyIssues(): Promise<{ ok: boolean; issues: MyIssueRow[]; total: number }> {
  return post('get_my_issues')
}

/** Добавить комментарий к своему нарушению */
export async function addIssueComment(issueId: string, comment: string): Promise<{ ok: boolean; issue_id: string }> {
  return post('add_issue_comment', { issue_id: issueId, comment })
}

/** Получить текущую геолокацию через браузер */
export function getCurrentPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Геолокация не поддерживается браузером.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Разреши доступ к геолокации в настройках.'))
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Не удалось определить геолокацию. Попробуй ещё раз.'))
        } else {
          reject(new Error('Ошибка геолокации: ' + err.message))
        }
      },
      { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true }
    )
  })
}
