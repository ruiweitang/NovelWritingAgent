<script setup lang="ts">
/**
 * 全局 Toast：读取 ui store，顶部居中堆叠，滑入滑出
 */
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import type { ToastType } from '@/stores/ui'
import type { Component } from 'vue'

const ui = useUiStore()

/** 类型 → 图标映射 */
const ICONS: Record<ToastType, Component> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}
</script>

<template>
  <div class="toast-wrap">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast-item" :class="t.type">
        <component :is="ICONS[t.type]" :size="15" class="toast-icon" />
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 62px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 520px;
  padding: 9px 16px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  box-shadow: var(--shadow-pop);
  font-size: 13px;
  pointer-events: auto;
}
.toast-item.success .toast-icon {
  color: var(--green);
}
.toast-item.error .toast-icon {
  color: var(--red);
}
.toast-item.warning .toast-icon {
  color: var(--orange);
}
.toast-item.info .toast-icon {
  color: var(--accent);
}
</style>
