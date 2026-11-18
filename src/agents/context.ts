/**
 * 上下文组装：按勾选拼接上游内容，构造生成 / AI 调整的消息列表
 */
import type {
  Chapter,
  LlmMessage,
  NovelProject,
  SettingStageId,
  StageId,
} from '@/types'
import { stageDef } from './stages'

/**
 * 按勾选拼接上游环节内容（带分节标题与状态标注）
 * @param project 当前项目
 * @param stageId 当前环节 id
 * @param toggles 上游上下文勾选表
 */
export function buildContext(
  project: NovelProject,
  stageId: StageId,
  toggles: Record<string, boolean>,
): string {
  const def = stageDef(stageId)
  const sections: string[] = []
  for (const upId of def.upstream) {
    if (toggles[upId] === false) continue
    const data = project.stages[upId as SettingStageId]
    if (!data || !data.content.trim()) continue
    const statusLabel = data.status === 'confirmed' ? '已确认' : '草稿'
    sections.push(
      `# 上游设定：${stageDef(upId).name}（${statusLabel}）\n\n${data.content.trim()}`,
    )
  }
  return sections.join('\n\n---\n\n')
}

/**
 * 构造系统消息：环节提示词 + 项目信息 + 勾选的上游上下文
 * @param project 当前项目
 * @param stageId 当前环节 id
 * @param systemPrompt 环节系统提示词
 * @param toggles 上游上下文勾选表
 */
export function buildSystemMessage(
  project: NovelProject,
  stageId: StageId,
  systemPrompt: string,
  toggles: Record<string, boolean>,
): string {
  const context = buildContext(project, stageId, toggles)
  let system = `${systemPrompt}\n\n# 项目信息\n小说名称：《${project.title}》`
  if (context) {
    system += `\n\n# 上游设定上下文（请严格保持一致，不得矛盾）\n\n${context}`
  }
  return system
}

/**
 * 构造"生成"请求的消息列表
 * @param project 当前项目
 * @param stageId 当前环节 id
 * @param systemPrompt 环节系统提示词
 * @param toggles 上游上下文勾选表
 * @param userInput 用户本环节创作要求
 * @param chapter 章节（stageId 为 chapter 时必传）
 */
export function buildGenerateMessages(
  project: NovelProject,
  stageId: StageId,
  systemPrompt: string,
  toggles: Record<string, boolean>,
  userInput: string,
  chapter?: Chapter | null,
): LlmMessage[] {
  const system = buildSystemMessage(project, stageId, systemPrompt, toggles)
  let user: string
  if (stageId === 'chapter' && chapter) {
    user = `请撰写章节《${chapter.title}》的完整正文。`
    if (chapter.notes.trim()) {
      user += `\n\n本章创作备注：\n${chapter.notes.trim()}`
    }
  } else {
    user = userInput.trim()
      ? `我的创作要求与灵感如下：\n${userInput.trim()}`
      : '我暂时没有更多具体要求，请基于上游设定与你的专业判断，产出完整方案。'
  }
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

/**
 * 构造"AI 调整"请求的消息列表：当前文稿 + 修改指令，要求输出完整修改稿
 * @param project 当前项目
 * @param stageId 当前环节 id
 * @param systemPrompt 环节系统提示词
 * @param toggles 上游上下文勾选表
 * @param currentContent 当前文稿内容
 * @param instruction 用户修改指令
 */
export function buildAdjustMessages(
  project: NovelProject,
  stageId: StageId,
  systemPrompt: string,
  toggles: Record<string, boolean>,
  currentContent: string,
  instruction: string,
): LlmMessage[] {
  const base = buildSystemMessage(project, stageId, systemPrompt, toggles)
  const system = `${base}\n\n# 当前任务：修改文稿
用户会给出【当前文稿】与【修改指令】。请严格按修改指令对文稿进行调整，未涉及的部分尽量保持原样。
输出要求：只输出修改后的完整文稿（Markdown），不要输出任何解释、说明或前后缀。`
  const user = `【当前文稿】\n${currentContent}\n\n【修改指令】\n${instruction.trim()}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
