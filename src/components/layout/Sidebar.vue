<script setup lang="ts">
/**
 * 工作台左侧导航：六个设定环节 + 章节列表（可新建章节）
 */
import { BookOpen, Plus } from 'lucide-vue-next'
import { SETTING_STAGES } from '@/agents/stages'
import { newChapter } from '@/stores/projects'
import ChapterList from '@/components/workspace/ChapterList.vue'
import type { NovelProject, StageId } from '@/types'

const props = defineProps<{
  project: NovelProject
  activeStageId: StageId
  activeChapterId: string | null
}>()

const emit = defineEmits<{
  selectStage: [stageId: StageId]
  selectChapter: [id: string]
  chapterRemoved: [id: string]
}>()

/**
 * 新建章节：追加到项目并立即选中
 */
function addChapter(): void {
  const chapter = newChapter(`第 ${props.project.chapters.length + 1} 章`)
  props.project.chapters.push(chapter)
  emit('selectChapter', chapter.id)
}
</script>

<template>
  <aside class="sidebar">
    <div class="nav-group">
      <button
        v-for="stage in SETTING_STAGES"
        :key="stage.id"
        class="nav-row"
        :class="{ active: activeStageId === stage.id }"
        @click="emit('selectStage', stage.id)"
      >
        <component :is="stage.icon" :size="16" :stroke-width="1.8" />
        <span class="name">{{ stage.name }}</span>
        <span class="dot" :class="project.stages[stage.id].status" />
      </button>
    </div>

    <div class="nav-group">
      <div
        class="nav-row group-head"
        :class="{ active: activeStageId === 'chapter' }"
        @click="emit('selectStage', 'chapter')"
      >
        <BookOpen :size="16" :stroke-width="1.8" />
        <span class="name">章节正文</span>
        <span class="count">{{ project.chapters.length }}</span>
        <button class="add-btn" title="新建章节" @click.stop="addChapter">
          <Plus :size="14" />
        </button>
      </div>
      <ChapterList
        :project="project"
        :active-chapter-id="activeChapterId"
        @select="emit('selectChapter', $event)"
        @removed="emit('chapterRemoved', $event)"
      />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 12px 10px;
  overflow-y: auto;
  background: var(--bg-sidebar);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border-right: 0.5px solid var(--border);
}
.nav-group {
  margin-bottom: 16px;
}
.nav-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.nav-row:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.nav-row.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  transition: background var(--dur-base) var(--ease-apple);
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
.group-head {
  font-weight: 600;
}
.count {
  font-size: 11px;
  color: var(--text-tertiary);
}
.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.add-btn:hover {
  background: var(--bg-active);
  color: var(--text);
}
</style>