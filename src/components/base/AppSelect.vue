<script setup lang="ts">
/**
 * 通用下拉选择：原生 select 样式化 + 右侧箭头图标
 */
import { ChevronDown } from 'lucide-vue-next'

const model = defineModel<string>({ required: true })

defineProps<{
  options: { label: string; value: string }[]
  disabled?: boolean
}>()

/**
 * 同步原生 select 的选中值到 v-model
 * @param event change 事件
 */
function onChange(event: Event): void {
  model.value = (event.target as HTMLSelectElement).value
}
</script>

<template>
  <div class="app-select" :class="{ disabled }">
    <select :value="model" :disabled="disabled" @change="onChange">
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <ChevronDown :size="14" class="chev" />
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
}
.app-select select {
  width: 100%;
  height: 34px;
  padding: 0 28px 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-btn);
  background: var(--bg-input);
  appearance: none;
  outline: none;
  cursor: pointer;
  font-size: 13px;
  transition:
    border-color var(--dur-fast) var(--ease-apple),
    box-shadow var(--dur-fast) var(--ease-apple);
}
.app-select select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.app-select.disabled select {
  opacity: 0.5;
  cursor: not-allowed;
}
.chev {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}
</style>
