<script setup lang="ts">
/**
 * 空状态引导：图标 + 标题 + 描述 + 操作槽
 */
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <component :is="icon" :size="30" :stroke-width="1.6" />
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  margin-bottom: 6px;
  border-radius: 22px;
  background: var(--accent-soft);
  color: var(--accent);
}
.empty-state h3 {
  font-size: 16px;
  font-weight: 700;
}
.empty-state p {
  max-width: 360px;
  font-size: 13px;
  color: var(--text-secondary);
}
.empty-action {
  margin-top: 12px;
}
</style>
