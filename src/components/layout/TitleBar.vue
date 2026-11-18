<script setup lang="ts">
/**
 * 顶部标题栏：可拖拽窗口区域、面包屑、保存状态、主题切换、设置入口
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Check, Home, Loader2, Moon, Settings, Sun } from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const projects = useProjectsStore()
const settings = useSettingsStore()

/** 系统是否处于深色模式（用于 system 主题解析） */
const systemDark = ref(false)
let media: MediaQueryList | null = null

/**
 * 同步系统深色偏好
 */
function syncSystemDark(): void {
  systemDark.value = media?.matches ?? false
}

onMounted(() => {
  media = window.matchMedia('(prefers-color-scheme: dark)')
  syncSystemDark()
  media.addEventListener('change', syncSystemDark)
})

onBeforeUnmount(() => media?.removeEventListener('change', syncSystemDark))

/** 当前解析后的主题（light / dark） */
const resolved = computed(() =>
  settings.settings.theme === 'system'
    ? systemDark.value
      ? 'dark'
      : 'light'
    : settings.settings.theme,
)

/** 面包屑标题（工作台显示书名，设置页显示"设置"） */
const crumb = computed(() => {
  if (route.name === 'workspace') return projects.current?.title ?? ''
  if (route.name === 'settings') return '设置'
  return ''
})

/**
 * 切换深浅色主题
 */
function toggleTheme(): void {
  settings.setTheme(resolved.value === 'dark' ? 'light' : 'dark')
}

/**
 * 回到项目列表页
 */
function goHome(): void {
  router.push('/')
}

/**
 * 打开设置页
 */
function goSettings(): void {
  router.push('/settings')
}
</script>

<template>
  <header class="title-bar" data-tauri-drag-region>
    <div class="left">
      <button class="bar-btn" title="项目列表" @click="goHome">
        <Home :size="15" />
      </button>
      <template v-if="crumb">
        <span class="sep">/</span>
        <span class="crumb">{{ crumb }}</span>
      </template>
    </div>
    <div class="right">
      <Transition name="expand">
        <span
          v-if="route.name === 'workspace' && projects.saveState !== 'idle'"
          class="save-state"
          :class="projects.saveState"
        >
          <Loader2 v-if="projects.saveState === 'saving'" :size="12" class="spin" />
          <Check v-else :size="12" />
          {{ projects.saveState === 'saving' ? '保存中' : '已保存' }}
        </span>
      </Transition>
      <button
        class="bar-btn"
        :title="resolved === 'dark' ? '切换浅色模式' : '切换深色模式'"
        @click="toggleTheme"
      >
        <Sun v-if="resolved === 'dark'" :size="15" />
        <Moon v-else :size="15" />
      </button>
      <button class="bar-btn" title="设置" @click="goSettings">
        <Settings :size="15" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 14px 0 84px;
  background: var(--bg-sidebar);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border-bottom: 0.5px solid var(--border);
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.sep {
  color: var(--text-tertiary);
  font-size: 13px;
}
.crumb {
  font-size: 13px;
  font-weight: 600;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple),
    transform var(--dur-fast) var(--ease-apple);
}
.bar-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.bar-btn:active {
  transform: scale(0.92);
}
.save-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 4px;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.save-state.saved {
  color: var(--green);
}
</style>
