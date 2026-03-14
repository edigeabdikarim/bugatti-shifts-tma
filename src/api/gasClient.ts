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
  role: 'employee' | 'manager'
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
