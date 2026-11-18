/**
 * 项目 store：项目列表、当前项目、防抖自动保存、版本快照工具
 */
import { defineStore } from 'pinia'
import { nextTick, ref, watch } from 'vue'
import * as api from '@/api/storage'
import { SETTING_STAGES, stageDef } from '@/agents/stages'
import type {
  Chapter,
  NovelProject,
  ProjectMeta,
  SettingStageId,
  StageData,
  Version,
} from '@/types'

/** 版本历史条数上限 */
const VERSION_LIMIT = 20

/**
 * 构造空白环节数据（上游勾选默认全开）
 * @param upstream 上游环节 id 列表
 */
export function newStageData(upstream: SettingStageId[]): StageData {
  const toggles: Record<string, boolean> = {}
  for (const id of upstream) toggles[id] = true
  return {
    content: '',
    status: 'empty',
    userInput: '',
    contextToggles: toggles,
    versions: [],
    chatHistory: [],
  }
}

/**
 * 构造新项目对象
 * @param title 书名
 */
export function newProject(title: string): NovelProject {
  const stages = {} as Record<SettingStageId, StageData>
  for (const stage of SETTING_STAGES) {
    stages[stage.id] = newStageData(stage.upstream)
  }
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    stages,
    chapters: [],
  }
}

/**
 * 构造新章节（上下文勾选默认全开）
 * @param title 章节标题
 */
export function newChapter(title: string): Chapter {
  const toggles: Record<string, boolean> = {}
  for (const id of stageDef('chapter').upstream) toggles[id] = true
  return {
    id: crypto.randomUUID(),
    title,
    notes: '',
    content: '',
    status: 'empty',
    contextToggles: toggles,
    versions: [],
    chatHistory: [],
  }
}

/**
 * 将当前内容存为版本快照（超过上限时淘汰最旧一条）
 * @param target 含 content/versions 的环节或章节对象
 * @param label 版本标签（如"重新生成前"）
 */
export function pushVersion(
  target: { content: string; versions: Version[] },
  label: string,
): void {
  if (!target.content.trim()) return
  target.versions.unshift({
    id: crypto.randomUUID(),
    content: target.content,
    label,
    createdAt: Date.now(),
  })
  if (target.versions.length > VERSION_LIMIT) {
    target.versions.length = VERSION_LIMIT
  }
}

/**
 * 计算项目确认进度（与 Rust 索引口径一致：6 设定环节 + 章节数）
 * @param project 项目对象
 */
export function projectProgress(project: NovelProject): {
  confirmed: number
  total: number
} {
  let confirmed = 0
  for (const stage of SETTING_STAGES) {
    if (project.stages[stage.id].status === 'confirmed') confirmed++
  }
  for (const chapter of project.chapters) {
    if (chapter.status === 'confirmed') confirmed++
  }
  return { confirmed, total: 6 + project.chapters.length }
}

export const useProjectsStore = defineStore('projects', () => {
  const metas = ref<ProjectMeta[]>([])
  const current = ref<NovelProject | null>(null)
  const saveState = ref<'idle' | 'saving' | 'saved'>('idle')
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let suppress = false

  /**
   * 加载项目索引列表（按更新时间倒序）
   */
  async function loadList(): Promise<void> {
    metas.value = (await api.listProjects()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
  }

  /**
   * 打开项目为当前项目
   * @param id 项目 id
   */
  async function open(id: string): Promise<void> {
    suppress = true
    current.value = await api.getProject(id)
    saveState.value = 'idle'
    await nextTick()
    suppress = false
  }

  /**
   * 同步本地索引元信息（保存后调用）
   * @param project 项目对象
   */
  function syncMeta(project: NovelProject): void {
    const progress = projectProgress(project)
    const meta: ProjectMeta = {
      id: project.id,
      title: project.title,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      ...progress,
    }
    const index = metas.value.findIndex((m) => m.id === project.id)
    if (index >= 0) metas.value[index] = meta
    else metas.value.unshift(meta)
  }

  /**
   * 立即保存当前项目（更新 updatedAt 并同步索引）
   */
  async function flushSave(): Promise<void> {
    clearTimeout(saveTimer)
    const project = current.value
    if (!project) return
    saveState.value = 'saving'
    suppress = true
    project.updatedAt = Date.now()
    await nextTick()
    suppress = false
    try {
      await api.saveProject(JSON.parse(JSON.stringify(project)))
      syncMeta(project)
      saveState.value = 'saved'
    } catch (e) {
      saveState.value = 'idle'
      console.error('保存项目失败', e)
    }
  }

  /**
   * 防抖 800ms 自动保存
   */
  function scheduleSave(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      flushSave().catch((e) => console.error('自动保存失败', e))
    }, 800)
  }

  // 当前项目任意深层变化 → 自动保存（加载/保存自身变更时抑制）
  watch(
    current,
    () => {
      if (suppress || !current.value) return
      scheduleSave()
    },
    { deep: true },
  )

  /**
   * 新建项目并加入索引
   * @param title 书名
   * @returns 新项目 id
   */
  async function create(title: string): Promise<string> {
    const project = newProject(title)
    await api.createProject(project)
    syncMeta(project)
    return project.id
  }

  /**
   * 重命名项目
   * @param id 项目 id
   * @param title 新书名
   */
  async function rename(id: string, title: string): Promise<void> {
    if (current.value?.id === id) {
      current.value.title = title
      await flushSave()
      return
    }
    const project = await api.getProject(id)
    if (!project) return
    project.title = title
    project.updatedAt = Date.now()
    await api.saveProject(project)
    syncMeta(project)
  }

  /**
   * 删除项目
   * @param id 项目 id
   */
  async function remove(id: string): Promise<void> {
    await api.deleteProject(id)
    metas.value = metas.value.filter((m) => m.id !== id)
    if (current.value?.id === id) current.value = null
  }

  /**
   * 关闭当前项目（先落盘再清空）
   */
  async function close(): Promise<void> {
    await flushSave()
    suppress = true
    current.value = null
    await nextTick()
    suppress = false
  }

  return {
    metas,
    current,
    saveState,
    loadList,
    open,
    create,
    rename,
    remove,
    close,
    flushSave,
  }
})
