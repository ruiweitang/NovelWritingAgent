<script setup lang="ts">
/**
 * 通用按钮：苹果风变体（primary/secondary/ghost/danger）、加载态、按压回弹
 */
import { Loader2 } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'md', loading: false, disabled: false },
)
</script>

<template>
  <button
    class="app-btn"
    :class="[`v-${variant}`, `s-${size}`]"
    :disabled="disabled || loading"
  >
    <Loader2 v-if="loading" :size="size === 'sm' ? 13 : 15" class="spin" />
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-btn);
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease-apple),
    transform var(--dur-fast) var(--ease-apple),
    opacity var(--dur-fast) var(--ease-apple),
    box-shadow var(--dur-fast) var(--ease-apple);
}
.app-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.app-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.s-md {
  height: 34px;
  padding: 0 16px;
  font-size: 13.5px;
}
.s-sm {
  height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
}

.v-primary {
  background: var(--accent);
  color: var(--accent-text);
}
.v-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}
.v-primary:active:not(:disabled) {
  background: var(--accent-active);
}

.v-secondary {
  background: var(--bg-elevated);
  color: var(--text);
  border: 1px solid var(--border-strong);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.v-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
}

.v-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.v-ghost:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.v-danger {
  background: var(--red-soft);
  color: var(--red);
}
.v-danger:hover:not(:disabled) {
  background: var(--red);
  color: #fff;
}
</style>
