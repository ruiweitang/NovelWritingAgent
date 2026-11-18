<script setup lang="ts">
/**
 * 环节步骤条：七个横向 pill，展示确认状态与章节数
 */
import { Check } from 'lucide-vue-next'
import { STAGES } from '@/agents/stages'
import type { NovelProject, StageId } from '@/types'

defineProps<{
  project: NovelProject
  activeStageId: StageId
}>()

const emit = defineEmits<{ select: [stageId: StageId] }>()

/**
 * 判断设定环节是否已确认
 * @param project 项目对象
 * @param stageId 环节 id
 */
function isConfirmed(project: NovelProject, stageId: StageId): boolean {
  if (stageId === 'chapter') return false
  return project.stages[stageId].status === 'confirmed'
}
</script>

<template>
  <div class="stepper">
    <button
      v-for="(stage, index) in STAGES"
      :key="stage.id"
      class="pill"
      :class="{
        active: activeStageId === stage.id,
        confirmed: isConfirmed(project, stage.id),
      }"
      @click="emit('select', stage.id)"
    >
      <span class="index">{{ index + 1 }}</span>
      <component
        :is="isConfirmed(project, stage.id) ? Check : stage.icon"
        :size="14"
        :stroke-width="2"
        :class="{ 'check-draw': isConfirmed(project, stage.id) }"
      />
      <span class="name">{{ stage.name }}</span>
      <span v-if="stage.id === 'chapter'" class="badge">
        {{ project.chapters.length }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.stepper::-webkit-scrollbar {
  display: none;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple),
    transform var(--dur-fast) var(--ease-apple);
}
.pill:hover {
  background: var(--bg-active);
  color: var(--text);
}
.pill:active {
  transform: scale(0.96);
}
.pill.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.pill.confirmed {
  color: var(--green);
}
.pill.confirmed.active {
  background: var(--green-soft);
}
.index {
  font-size: 10.5px;
  color: var(--text-tertiary);
}
.pill.active .index {
  color: inherit;
  opacity: 0.7;
}
.name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--bg-active);
  font-size: 10px;
}
</style>