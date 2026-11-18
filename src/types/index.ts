/**
 * 全局类型定义：模型服务商、智能体绑定、项目/环节/章节数据结构
 */

/** 七个创作环节 id（chapter 为章节正文，共用一套智能体绑定） */
export type StageId =
  | 'concept'
  | 'worldview'
  | 'characters'
  | 'arcs'
  | 'events'
  | 'outline'
  | 'chapter'

/** 前六个设定环节 id */
export type SettingStageId = Exclude<StageId, 'chapter'>

/** 环节/章节状态：未开始 / 草稿 / 已确认 */
export type StageStatus = 'empty' | 'draft' | 'confirmed'

/** 模型服务商（OpenAI 兼容协议） */
export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  /** 预设标识（deepseek/kimi/qwen/zhipu/openai/ollama/custom） */
  preset?: string
}

/** 单个环节的智能体配置 */
export interface AgentBinding {
  /** 为空字符串时回退到全局默认绑定 */
  providerId: string
  model: string
  temperature: number
  systemPrompt: string
}

/** 全局设置 */
export interface Settings {
  providers: Provider[]
  /** 新环节默认绑定 */
  defaultBinding: { providerId: string; model: string }
  /** 七个环节各一份智能体配置 */
  stageBindings: Record<StageId, AgentBinding>
  theme: 'system' | 'light' | 'dark'
}

/** 内容版本快照 */
export interface Version {
  id: string
  content: string
  label: string
  createdAt: number
}

/** AI 调整对话消息 */
export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

/** 设定环节数据（前六个环节） */
export interface StageData {
  /** Markdown 结果 */
  content: string
  status: StageStatus
  /** 用户本环节的创作要求/灵感输入 */
  userInput: string
  /** 上游上下文勾选（key 为上游环节 id） */
  contextToggles: Record<string, boolean>
  /** 版本历史（上限 20 条） */
  versions: Version[]
  /** AI 调整对话记录 */
  chatHistory: ChatMsg[]
}

/** 章节数据（第七环节，每章独立） */
export interface Chapter {
  id: string
  title: string
  /** 本章创作备注（相当于环节的 userInput） */
  notes: string
  content: string
  status: StageStatus
  contextToggles: Record<string, boolean>
  versions: Version[]
  chatHistory: ChatMsg[]
}

/** 小说项目完整数据 */
export interface NovelProject {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  stages: Record<SettingStageId, StageData>
  chapters: Chapter[]
}

/** 项目索引元信息（首页列表用，由 Rust 侧计算进度） */
export interface ProjectMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  confirmed: number
  total: number
}

/** OpenAI 兼容聊天消息 */
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 流式聊天请求载荷 */
export interface ChatPayload {
  baseUrl: string
  apiKey: string
  model: string
  messages: LlmMessage[]
  temperature: number
}

/** Rust 侧推送的流事件 */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
