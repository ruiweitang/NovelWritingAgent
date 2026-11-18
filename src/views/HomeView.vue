<script setup lang="ts">
/**
 * 项目列表页：新建/重命名/删除项目、确认进度展示，点击卡片进入创作工作台
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppModal from '@/components/base/AppModal.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { useProjectsStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'
import { formatTime } from '@/utils/format'
import type { ProjectMeta } from '@/types'

const router = useRouter()
const projects = useProjectsStore()
const ui = useUiStore()

/** 命名弹窗目标：'new' 新建 / ProjectMeta 重命名 / null 关闭 */
const nameTarget = ref<ProjectMeta | 'new' | null>(null)
/** 书名草稿 */
const nameDraft = ref('')
/** 提交中（防重复提交） */
const submitting = ref(false)
/** 待删除确认的项目（null 表示弹窗关闭） */
const removeTarget = ref<ProjectMeta | null>(null)

/** 命名弹窗标题 */
const nameTitle = computed(() =>
  nameTarget.value === 'new' ? '新建小说项目' : '重命名项目',
)

onMounted(() => {
  projects.loadList().catch((e) => {
    console.error('加载项目列表失败', e)
    ui.toast('加载项目列表失败', 'error')
  })
})

/**
 * 打开新建项目弹窗
 */
function openCreate(): void {
  nameDraft.value = ''
  nameTarget.value = 'new'
}

/**
 * 打开重命名弹窗
 * @param meta 项目元信息
 */
function openRename(meta: ProjectMeta): void {
  nameDraft.value = meta.title
  nameTarget.value = meta
}

/**
 * 提交命名：新建则创建并进入工作台，重命名则更新书名
 */
async function submitName(): Promise<void> {
  const title = nameDraft.value.trim()
  if (!title) {
    ui.toast('请输入书名', 'warning')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    if (nameTarget.value === 'new') {
      const id = await projects.create(title)
      nameTarget.value = null
      router.push(`/project/${id}`)
    } else if (nameTarget.value) {
      await projects.rename(nameTarget.value.id, title)
      ui.toast('已重命名', 'success')
      nameTarget.value = null
    }
  } catch (e) {
    console.error('保存项目失败', e)
    ui.toast('操作失败，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

/**
 * 确认删除项目
 */
async function confirmRemove(): Promise<void> {
  if (!removeTarget.value) return
  try {
    await projects.remove(removeTarget.value.id)
    ui.toast('项目已删除', 'success')
  } catch (e) {
    console.error('删除项目失败', e)
    ui.toast('删除失败，请重试', 'error')
  }
  removeTarget.value = null
}

/**
 * 进入项目工作台
 * @param id 项目 id
 */
function openProject(id: string): void {
  router.push(`/project/${id}`)
}

/**
 * 计算确认进度百分比
 * @param meta 项目元信息
 */
function percent(meta: ProjectMeta): number {
  return meta.total ? Math.round((meta.confirmed / meta.total) * 100) : 0
}
</script>

<template>
  <div class="home-view">
    <div class="home-inner">
      <header class="home-head">
        <div>
          <h1>小说项目</h1>
          <p class="sub">从构思到正文，七个智能体环节陪你写完一本书</p>
        </div>
        <AppButton variant="primary" @click="openCreate">
          <Plus :size="15" />
          新建项目
        </AppButton>
      </header>

      <EmptyState
        v-if="!projects.metas.length"
        :icon="BookOpen"
        title="还没有小说项目"
        description="新建一个项目，从一句话灵感开始，逐步构建你的小说世界"
      >
        <template #action>
          <AppButton variant="primary" @click="openCreate">
            <Plus :size="15" />
            新建项目
          </AppButton>
        </template>
      </EmptyState>

      <TransitionGroup v-else name="list" tag="div" class="project-grid">
        <div
          v-for="meta in projects.metas"
          :key="meta.id"
          class="project-card"
          @click="openProject(meta.id)"
        >
          <div class="card-top">
            <div class="book-icon">
              <BookOpen :size="18" :stroke-width="1.8" />
            </div>
            <div class="card-actions">
              <button
                class="icon-btn"
                title="重命名"
                @click.stop="openRename(meta)"
              >
                <Pencil :size="13" />
              </button>
              <button
                class="icon-btn danger"
                title="删除"
                @click.stop="removeTarget = meta"
              >
                <Trash2 :size="13" />
              </button>
            </div>
          </div>
          <h3 class="card-title">{{ meta.title }}</h3>
          <p class="card-time">{{ formatTime(meta.updatedAt) }} 更新</p>
          <div class="progress">
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${percent(meta)}%` }"
              />
            </div>
            <span class="progress-text">
              {{ meta.confirmed }}/{{ meta.total }} 已确认
            </span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- 新建/重命名弹窗 -->
    <AppModal
      :open="nameTarget !== null"
      :title="nameTitle"
      :width="420"
      @update:open="nameTarget = null"
    >
      <div class="field">
        <label class="field-label">书名</label>
        <AppInput
          v-model="nameDraft"
          placeholder="例如：星穹之下"
          @keyup.enter="submitName"
        />
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="nameTarget = null">取消</AppButton>
        <AppButton variant="primary" :loading="submitting" @click="submitName">
          {{ nameTarget === 'new' ? '创建' : '保存' }}
        </AppButton>
      </template>
    </AppModal>

    <!-- 删除项目确认 -->
    <AppModal
      :open="removeTarget !== null"
      title="删除项目"
      :width="420"
      @update:open="removeTarget = null"
    >
      <p class="confirm-text">
        确定删除「{{ removeTarget?.title }}」吗？全部设定、章节与版本历史将被移除，且无法恢复。
      </p>
      <template #footer>
        <AppButton variant="ghost" @click="removeTarget = null">取消</AppButton>
        <AppButton variant="danger" @click="confirmRemove">删除</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.home-view {
  height: 100%;
  overflow-y: auto;
}
.home-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 36px 28px 60px;
}
.home-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.home-head h1 {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 项目卡片网格 */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.project-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition:
    transform var(--dur-base) var(--ease-apple),
    box-shadow var(--dur-base) var(--ease-apple);
}
.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.book-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
}
.card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-apple);
}
.project-card:hover .card-actions {
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
.card-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-time {
  font-size: 12px;
  color: var(--text-tertiary);
}
.progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.progress-track {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--accent);
  transition: width var(--dur-slow) var(--ease-apple);
}
.progress-text {
  flex-shrink: 0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.confirm-text {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-secondary);
}
</style>
