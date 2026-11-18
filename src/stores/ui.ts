/**
 * UI store：全局 Toast 通知
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Toast 类型 */
export type ToastType = 'info' | 'success' | 'error' | 'warning'

/** 单条 Toast */
export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

let toastSeq = 0

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastItem[]>([])

  /**
   * 弹出一条 Toast（3.2 秒后自动消失，错误 5 秒）
   * @param message 文案
   * @param type 类型
   */
  function toast(message: string, type: ToastType = 'info'): void {
    const id = ++toastSeq
    toasts.value.push({ id, type, message })
    setTimeout(() => dismiss(id), type === 'error' ? 5000 : 3200)
  }

  /**
   * 移除指定 Toast
   * @param id Toast id
   */
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, toast, dismiss }
})
