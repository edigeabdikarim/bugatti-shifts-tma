/**
 * Обёртка над Telegram Web App SDK (@twa-dev/sdk / window.Telegram).
 * В dev-режиме (без Telegram) возвращает mock-данные.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; last_name?: string; username?: string }
    auth_date?: number
    hash?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    setText(text: string): void
    onClick(fn: () => void): void
    offClick(fn: () => void): void
    show(): void
    hide(): void
    enable(): void
    disable(): void
    showProgress(leaveActive?: boolean): void
    hideProgress(): void
  }
  BackButton: {
    isVisible: boolean
    onClick(fn: () => void): void
    offClick(fn: () => void): void
    show(): void
    hide(): void
  }
  ready(): void
  expand(): void
  close(): void
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback: (confirmed: boolean) => void): void
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }
}

const IS_DEV = import.meta.env.DEV && !window.Telegram?.WebApp?.initData

/** Возвращает Telegram Web App объект или null в dev-режиме */
export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

/** initData для передачи в GAS API. В dev-режиме — тестовая строка. */
export function getInitData(): string {
  const tg = getTelegramWebApp()
  if (tg?.initData) return tg.initData
  if (IS_DEV) {
    // В dev-режиме: test:<user_id>
    // Замени на свой telegram_user_id для тестирования
    const devUserId = localStorage.getItem('dev_telegram_user_id') || 'DEV_USER'
    return `test:${devUserId}`
  }
  return ''
}

/** Вызвать когда приложение готово (скрывает loading screen Telegram) */
export function telegramReady(): void {
  const tg = getTelegramWebApp()
  if (tg) {
    tg.ready()
    tg.expand()
  }
}

/** Показать нативный алерт Telegram или browser alert в dev */
export function showAlert(message: string, callback?: () => void): void {
  const tg = getTelegramWebApp()
  if (tg) {
    tg.showAlert(message, callback)
  } else {
    window.alert(message)
    callback?.()
  }
}

/** Вибрация при успехе */
export function hapticSuccess(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('success')
}

/** Вибрация при ошибке */
export function hapticError(): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('error')
}

export { IS_DEV }
