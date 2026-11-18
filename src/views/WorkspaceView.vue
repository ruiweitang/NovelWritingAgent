<script setup lang="ts">
/**
 * 创作工作台：左侧环节/章节导航 + 环节主视图 + 右侧智能体面板（可折叠）
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BookOpen, Loader2, PanelRightOpen, Plus } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import StageStepper from '@/components/workspace/StageStepper.vue'
import StageView from '@/components/workspace/StageView.vue'
import AgentPanel from '@/components/workspace/AgentPanel.vue'
import { newChapter, useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import type { StageId } from '@/types'

const route = useRoute()
const router = useRouter()
const projects = useProjectsStore()
const settings = useSettingsStore()
const ui = useUiStore()

/** 项目加载中 */
const loading = ref(true)
/** 当前环节 id */
const activeStageId = ref<StageId>('concept')
/** 当前选中章节 id */
const activeChapterId = ref<string | null>(null)
/** 右侧智能体面板是否展开 */
const panelOpen = ref(true)

/** 当前选中的章节对象 */
const activeChapter = computed(
  () =>
    projects.current?.chapters.find((c) => c.id === activeChapterId.value) ??
    null,
)

/** 环节/章节切换时强制重建主视图与面板的 key */
const stageKey = computed(
  () => `${activeStageId.value}:${activeChapterId.value ?? ''}`,
)

/** 面板可见性：章节环节必须先选中章节（AgentPanel 依赖章节数据） */
const panelVisible = computed(
  () =>
    panelOpen.value &&
    (activeStageId.value !== 'chapter' || !!activeChapter.value),
)

onMounted(async () => {
  try {
    if (!settings.loaded) await settings.load()
    await projects.open(String(route.params.id))
    if (!projects.current) {
      ui.toast('项目不存在或已被删除', 'error')
      router.replace('/')
      return
    }
    loading.value = false
  } catch (e) {
    console.error('打开项目失败', e)
    ui.toast('打开项目失败', 'error')
    router.replace('/')
  }
})

// 离开工作台时落盘并关闭当前项目
onUnmounted(() => {
  void projects.close()
})

/**
 * 切换环节；进入章节环节时自动选中第一章（若有）
 * @param id 环节 id
 */
function selectStage(id: StageId): void {
  activeStageId.value = id
  if (id === 'chapter' && !activeChapter.value) {
    activeChapterId.value = projects.current?.chapters[0]?.id ?? null
  }
}

/**
 * 选中章节并切到章节环节
 * @param id 章节 id
 */
function selectChapter(id: string): void {
  activeChapterId.value = id
  activeStageId.value = 'chapter'
}

/**
 * 章节被删除后回退选中剩余第一章
 * @param id 被删除的章节 id
 */
function onChapterRemoved(id: string): void {
  if (activeChapterId.value === id) {
    activeChapterId.value = projects.current?.chapters[0]?.id ?? null
  }
}

/**
 * 空状态下新建第一章并选中
 */
function createFirstChapter(): void {
  if (!projects.current) return
  const chapter = newChapter('第 1 章')
  projects.current.chapters.push(chapter)
  selectChapter(chapter.id)
}
</script>

<template>
  <div v-if="loading" class="workspace-loading">
    <Loader2 :size="22" class="spin" />
  </div>
  <div v-else-if="projects.current" class="workspace">
    <Sidebar
      :project="projects.current"
      :active-stage-id="activeStageId"
      :active-chapter-id="activeChapterId"
      @select-stage="selectStage"
      @select-chapter="selectChapter"
      @chapter-removed="onChapterRemoved"
    />
    <main class="work-main">
      <div class="top-bar">
        <StageStepper
          :project="projects.current"
          :active-stage-id="activeStageId"
          @select="selectStage"
        />
        <button
          v-if="!panelOpen"
          class="reopen-btn"
          title="展开智能体面板"
          @click="panelOpen = true"
        >
          <PanelRightOpen :size="16" />
        </button>
      </div>
      <div class="stage-body">
        <EmptyState
          v-if="activeStageId === 'chapter' && !activeChapter"
          class="chapter-empty"
          :icon="BookOpen"
          title="还没有章节"
          description="新建第一章，基于已确认的设定与大纲撰写正文"
        >
          <template #action>
            <AppButton variant="primary" @click="createFirstChapter">
              <Plus :size="15" />
              新建第一章
            </AppButton>
          </template>
        </EmptyState>
        <StageView
          v-else
          :key="stageKey"
          :project="projects.current"
          :stage-id="activeStageId"
          :chapter="activeChapter"
        />
        <Transition name="panel">
          <AgentPanel
            v-if="panelVisible"
            :key="stageKey"
            :project="projects.current"
            :stage-id="activeStageId"
            :chapter="activeChapter"
            @collapse="panelOpen = false"
          />
        </Transition>
      </div>
    </main>
  </div>
</template>

<style scoped>
.workspace-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}
.workspace {
  display: flex;
  height: 100%;
}
.work-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.top-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 0.5px solid var(--border);
}
.reopen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.reopen-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
.stage-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.chapter-empty {
  flex: 1;
}

/* 智能体面板滑入滑出 */
.panel-enter-active,
.panel-leave-active {
  transition:
    opacity var(--dur-base) var(--ease-apple),
    transform var(--dur-base) var(--ease-apple);
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
