<script setup lang="ts">
/**
 * 版本历史弹窗：展示版本快照列表，支持一键回滚
 */
import { History, RotateCcw } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import { formatTime } from '@/utils/format'
import type { Version } from '@/types'

const open = defineModel<boolean>('open', { required: true })

defineProps<{ versions: Version[] }>()

const emit = defineEmits<{ rollback: [version: Version] }>()

/**
 * 截取版本内容预览（前 100 字，去掉 Markdown 标记符号）
 * @param content 版本完整内容
 */
function preview(content: string): string {
  const plain = content.replace(/[#*>`\-|]/g, '').replace(/\s+/g, ' ').trim()
  return plain.length > 100 ? `${plain.slice(0, 100)}…` : plain
}

/**
 * 回滚到指定版本并关闭弹窗
 * @param version 目标版本
 */
function onRollback(version: Version): void {
  emit('rollback', version)
  open.value = false
}
</script>

<template>
  <AppModal v-model:open="open" title="版本历史" :width="560">
    <div v-if="versions.length" class="version-list">
      <div v-for="v in versions" :key="v.id" class="version-row">
        <div class="info">
          <div class="meta">
            <span class="label">{{ v.label }}</span>
            <span class="time">{{ formatTime(v.createdAt) }}</span>
          </div>
          <p class="preview">{{ preview(v.content) }}</p>
        </div>
        <AppButton size="sm" variant="ghost" @click="onRollback(v)">
          <RotateCcw :size="13" />
          回滚
        </AppButton>
      </div>
    </div>
    <div v-else class="empty">
      <History :size="22" />
      <p>暂无历史版本，重新生成或 AI 调整时会自动保存快照</p>
    </div>
  </AppModal>
</template>

<style scoped>
.version-list {
  display: flex;
  flex-direction: column;
}
.version-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 0.5px solid var(--border);
}
.version-row:last-child {
  border-bottom: none;
}
.info {
  flex: 1;
  min-width: 0;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  font-size: 13px;
  font-weight: 600;
}
.time {
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.preview {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: var(--text-tertiary);
  font-size: 12.5px;
  text-align: center;
}
</style>
