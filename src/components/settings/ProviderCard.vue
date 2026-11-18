<script setup lang="ts">
/**
 * 服务商卡片：名称/地址、掩码 Key、模型 chips、编辑与删除入口
 */
import { computed } from 'vue'
import { KeyRound, Pencil, Server, Trash2 } from 'lucide-vue-next'
import type { Provider } from '@/types'

const props = defineProps<{ provider: Provider }>()

const emit = defineEmits<{ edit: []; remove: [] }>()

/** 掩码后的 Key（仅露出后 4 位） */
const maskedKey = computed(() => {
  const key = props.provider.apiKey
  if (!key) return '未设置 Key（本地服务）'
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`
})

/** 卡片上最多展示 4 个模型，超出折叠为 +N */
const visibleModels = computed(() => props.provider.models.slice(0, 4))
const extraCount = computed(() => props.provider.models.length - 4)
</script>

<template>
  <div class="provider-card">
    <header class="card-head">
      <div class="p-icon">
        <Server :size="16" :stroke-width="1.8" />
      </div>
      <div class="p-info">
        <h4>{{ provider.name }}</h4>
        <p :title="provider.baseUrl">{{ provider.baseUrl }}</p>
      </div>
      <div class="p-actions">
        <button class="icon-btn" title="编辑" @click="emit('edit')">
          <Pencil :size="13" />
        </button>
        <button class="icon-btn danger" title="删除" @click="emit('remove')">
          <Trash2 :size="13" />
        </button>
      </div>
    </header>
    <div class="key-row">
      <KeyRound :size="13" />
      <span>{{ maskedKey }}</span>
    </div>
    <div class="chips">
      <span v-for="m in visibleModels" :key="m" class="chip">{{ m }}</span>
      <span v-if="extraCount > 0" class="chip more">+{{ extraCount }}</span>
      <span v-if="!provider.models.length" class="no-model">尚未配置模型</span>
    </div>
  </div>
</template>

<style scoped>
.provider-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition:
    box-shadow var(--dur-base) var(--ease-apple),
    transform var(--dur-base) var(--ease-apple);
}
.provider-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.p-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
}
.p-info {
  flex: 1;
  min-width: 0;
}
.p-info h4 {
  font-size: 13.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.p-info p {
  font-size: 11.5px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.p-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-apple);
}
.provider-card:hover .p-actions {
  opacity: 1;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.icon-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.icon-btn.danger:hover {
  background: var(--red-soft);
  color: var(--red);
}
.key-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.chip {
  padding: 2px 9px;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 11.5px;
}
.chip.more {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}
.no-model {
  font-size: 11.5px;
  color: var(--text-tertiary);
}
</style>
