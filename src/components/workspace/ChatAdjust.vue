<script setup lang="ts">
/**
 * AI 调整对话：对当前文稿下达修改指令 → 流式预览修改稿 → 应用/放弃
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Check, Send, Square, X } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import MarkdownView from '@/components/workspace/MarkdownView.vue'
import { buildAdjustMessages } from '@/agents/context'
import { cancelStream, streamChat } from '@/api/llm'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { pushVersion } from '@/stores/projects'
import type { Chapter, NovelProject, SettingStageId, StageId } from '@/types'

const props = defineProps<{
  project: NovelProject
  stageId: StageId
  chapter?: Chapter | null
}>()

const settings = useSettingsStore()
const ui = useUiStore()

/** 当前操作的数据对象（章节或设定环节） */
const data = computed(() =>
  props.stageId === 'chapter' && props.chapter
    ? props.chapter
    : props.project.stages[props.stageId as SettingStageId],
)

const instruction = ref('')
const streaming = ref(false)
const pending = ref('')
const historyRef = ref<HTMLElement | null>(null)

/** 会话代号：防止切换环节后过期流回调污染数据 */
let session = 0
let requestId = ''

/**
 * 发送修改指令：流式生成修改稿到待应用预览区
 */
function send(): void {
  const text = instruction.value.trim()
  if (!text || streaming.value) return
  if (!data.value.content.trim()) {
    ui.toast('当前还没有内容，请先生成或编写后再调整', 'warning')
    return
  }
  const binding = settings.bindingFor(props.stageId)
  const provider = settings.providerOf(binding)
  if (!provider || !binding.model) {
    ui.toast('请先在设置中配置模型服务商与默认模型', 'error')
    return
  }
  data.value.chatHistory.push({ role: 'user', content: text })
  if (data.value.chatHistory.length > 40) {
    data.value.chatHistory.splice(0, data.value.chatHistory.length - 40)
  }
  instruction.value = ''
  const messages = buildAdjustMessages(
    props.project,
    props.stageId,
    binding.systemPrompt,
    data.value.contextToggles,
    data.value.content,
    text,
  )
  const current = ++session
  streaming.value = true
  pending.value = ''
  requestId = streamChat(
    {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: binding.model,
      messages,
      temperature: binding.temperature,
    },
    {
      onDelta: (delta) => {
        if (current !== session) return
        pending.value += delta
      },
      onDone: () => {
        if (current !== session) return
        streaming.value = false
        pending.value = pending.value.trim()
      },
      onError: (message) => {
        if (current !== session) return
        streaming.value = false
        pending.value = ''
        ui.toast(`调整失败：${message}`, 'error')
      },
    },
  )
}

/**
 * 停止调整：保留已收到的部分修改稿供决定
 */
function stop(): void {
  session++
  if (requestId) cancelStream(requestId).catch(() => {})
  streaming.value = false
  pending.value = pending.value.trim()
  if (!pending.value) ui.toast('已停止调整', 'info')
}

/**
 * 应用修改稿：先存旧版本快照，再覆盖正文并降级为草稿
 */
function apply(): void {
  if (!pending.value.trim()) return
  pushVersion(data.value, 'AI 调整前')
  data.value.content = pending.value
  data.value.status = 'draft'
  data.value.chatHistory.push({
    role: 'assistant',
    content: '已应用本次修改',
  })
  pending.value = ''
  ui.toast('修改已应用，可在版本历史中回滚', 'success')
}

/**
 * 放弃修改稿
 */
function discard(): void {
  data.value.chatHistory.push({
    role: 'assistant',
    content: '已放弃本次修改',
  })
  pending.value = ''
}

/**
 * 输入框按键：Enter 发送，Shift+Enter 换行
 * @param event 键盘事件
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

// 对话历史或流式增量变化时自动滚到底部
watch(
  () => [data.value.chatHistory.length, pending.value],
  async () => {
    await nextTick()
    const el = historyRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

// 离开视图时终止未完成的调整流
onUnmounted(() => {
  session++
  if (streaming.value && requestId) cancelStream(requestId).catch(() => {})
})
</script>

<template>
  <section class="chat-adjust">
    <h4 class="section-title">AI 调整</h4>

    <div ref="historyRef" class="history">
      <p v-if="!data.chatHistory.length && !pending" class="history-empty">
        对当前内容不满意？直接告诉 AI 怎么改，例如"把反派动机改得更合理"。
      </p>
      <div
        v-for="(msg, index) in data.chatHistory"
        :key="index"
        class="bubble"
        :class="msg.role"
      >
        {{ msg.content }}
      </div>

      <div v-if="pending" class="pending">
        <div class="pending-label">
          {{ streaming ? '修改稿生成中…' : '修改稿预览' }}
        </div>
        <div class="pending-body">
          <MarkdownView :content="pending" :streaming="streaming" />
        </div>
        <div class="pending-actions">
          <AppButton
            v-if="streaming"
            size="sm"
            variant="danger"
            @click="stop"
          >
            <Square :size="13" />
            停止
          </AppButton>
          <template v-else>
            <AppButton size="sm" variant="primary" @click="apply">
              <Check :size="13" />
              应用
            </AppButton>
            <AppButton size="sm" variant="ghost" @click="discard">
              <X :size="13" />
              放弃
            </AppButton>
          </template>
        </div>
      </div>
    </div>

    <div class="composer">
      <textarea
        v-model="instruction"
        class="app-textarea composer-input"
        rows="2"
        placeholder="描述修改要求，Enter 发送…"
        :disabled="streaming"
        @keydown="onKeydown"
      />
      <button
        class="send-btn"
        :disabled="streaming || !instruction.trim()"
        title="发送"
        @click="send"
      >
        <Send :size="15" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.chat-adjust {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 12px 16px 14px;
}
.section-title {
  margin-bottom: 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--text-tertiary);
}
.history {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
}
.history-empty {
  padding: 8px 2px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);
}
.bubble {
  max-width: 92%;
  padding: 8px 11px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.bubble.user {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.bubble.assistant {
  align-self: flex-start;
  background: var(--bg-input);
  color: var(--text-secondary);
  border-bottom-left-radius: 4px;
}
.pending {
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-card);
  background: var(--bg-input);
  overflow: hidden;
}
.pending-label {
  padding: 7px 11px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent);
  border-bottom: 0.5px solid var(--border);
}
.pending-body {
  max-height: 260px;
  overflow-y: auto;
  padding: 8px 11px;
}
.pending-body :deep(.markdown-body) {
  font-size: 12.5px;
}
.pending-actions {
  display: flex;
  gap: 6px;
  padding: 8px 11px;
  border-top: 0.5px solid var(--border);
}
.composer {
  position: relative;
  flex-shrink: 0;
  margin-top: 8px;
}
.composer-input {
  padding-right: 42px;
  resize: none;
}
.send-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  transition:
    background var(--dur-fast) var(--ease-apple),
    opacity var(--dur-fast) var(--ease-apple),
    transform var(--dur-fast) var(--ease-apple);
}
.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}
.send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
