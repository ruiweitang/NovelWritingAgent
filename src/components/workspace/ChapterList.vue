<script setup lang="ts">
/**
 * 章节列表：选中、内联重命名、删除确认
 */
import { ref } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import type { NovelProject } from '@/types'

const props = defineProps<{
  project: NovelProject
  activeChapterId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  removed: [id: string]
}>()

/** 正在内联改名的章节 id 与草稿标题 */
const editingId = ref<string | null>(null)
const draftTitle = ref('')
/** 待删除章节 id（控制确认弹窗） */
const removingId = ref<string | null>(null)

/**
 * 进入内联改名状态
 * @param id 章节 id
 * @param title 当前标题
 */
function startRename(id: string, title: string): void {
  editingId.value = id
  draftTitle.value = title
}

/**
 * 提交改名（空标题则放弃修改）
 */
function commitRename(): void {
  const id = editingId.value
  if (!id) return
  const chapter = props.project.chapters.find((c) => c.id === id)
  const title = draftTitle.value.trim()
  if (chapter && title) chapter.title = title
  editingId.value = null
}

/**
 * 确认删除章节：从项目移除并通知父组件
 */
function confirmRemove(): void {
  const id = removingId.value
  if (!id) return
  const index = props.project.chapters.findIndex((c) => c.id === id)
  if (index >= 0) props.project.chapters.splice(index, 1)
  removingId.value = null
  emit('removed', id)
}
</script>

<template>
  <div class="chapter-list">
    <div
      v-for="chapter in project.chapters"
      :key="chapter.id"
      class="chapter-row"
      :class="{ active: activeChapterId === chapter.id }"
      @click="emit('select', chapter.id)"
    >
      <template v-if="editingId === chapter.id">
        <input
          v-model="draftTitle"
          class="rename-input"
          autofocus
          @click.stop
          @keydown.enter="commitRename"
          @keydown.esc="editingId = null"
          @blur="commitRename"
        />
      </template>
      <template v-else>
        <span class="title">{{ chapter.title }}</span>
        <span class="dot" :class="chapter.status" />
        <span class="actions">
          <button
            class="icon-btn"
            title="重命名"
            @click.stop="startRename(chapter.id, chapter.title)"
          >
            <Pencil :size="12" />
          </button>
          <button
            class="icon-btn danger"
            title="删除章节"
            @click.stop="removingId = chapter.id"
          >
            <Trash2 :size="12" />
          </button>
        </span>
      </template>
    </div>
    <p v-if="!project.chapters.length" class="hint">点击右上角 + 新建章节</p>

    <AppModal
      :open="removingId !== null"
      title="删除章节"
      :width="400"
      @update:open="(v: boolean) => !v && (removingId = null)"
    >
      <p class="confirm-text">
        删除后该章节的正文与版本历史将无法恢复，确定删除吗？
      </p>
      <template #footer>
        <AppButton variant="ghost" @click="removingId = null">取消</AppButton>
        <AppButton variant="danger" @click="confirmRemove">删除</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 12px;
}
.chapter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border-radius: 7px;
  font-size: 12.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.chapter-row:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.chapter-row.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}
.dot.empty {
  background: var(--text-tertiary);
  opacity: 0.5;
}
.dot.draft {
  background: var(--accent);
}
.dot.confirmed {
  background: var(--green);
}
.actions {
  display: none;
  align-items: center;
  gap: 2px;
}
.chapter-row:hover .actions {
  display: flex;
}
.chapter-row:hover .dot {
  display: none;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  color: var(--text-secondary);
  transition: background var(--dur-fast) var(--ease-apple);
}
.icon-btn:hover {
  background: var(--bg-active);
  color: var(--text);
}
.icon-btn.danger:hover {
  background: var(--red-soft);
  color: var(--red);
}
.rename-input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--accent);
  border-radius: 5px;
  background: var(--bg-elevated);
  font-size: 12.5px;
  outline: none;
}
.hint {
  padding: 8px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.confirm-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>