/**
 * 本地存储 API 封装：设置与项目的 CRUD（invoke Rust 命令）
 */
import { invoke } from '@tauri-apps/api/core'
import type { NovelProject, ProjectMeta, Settings } from '@/types'

/**
 * 读取全局设置；首次启动（文件不存在）返回 null
 */
export function getSettings(): Promise<Settings | null> {
  return invoke<Settings | null>('get_settings')
}

/**
 * 保存全局设置
 * @param settings 完整设置对象
 */
export function saveSettings(settings: Settings): Promise<void> {
  return invoke('save_settings', { settings })
}

/**
 * 列出全部项目索引元信息
 */
export function listProjects(): Promise<ProjectMeta[]> {
  return invoke<ProjectMeta[]>('list_projects')
}

/**
 * 读取单个项目完整数据
 * @param id 项目 id
 */
export function getProject(id: string): Promise<NovelProject | null> {
  return invoke<NovelProject | null>('get_project', { id })
}

/**
 * 创建项目（写入项目文件并追加索引）
 * @param project 完整项目对象
 */
export function createProject(project: NovelProject): Promise<void> {
  return invoke('create_project', { project })
}

/**
 * 保存项目（同步更新索引）
 * @param project 完整项目对象
 */
export function saveProject(project: NovelProject): Promise<void> {
  return invoke('save_project', { project })
}

/**
 * 删除项目
 * @param id 项目 id
 */
export function deleteProject(id: string): Promise<void> {
  return invoke('delete_project', { id })
}
