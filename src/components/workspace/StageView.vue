<script setup lang="ts">
/**
 * 环节主视图：创作要求输入、流式生成、Markdown 预览/编辑、确认状态机、版本回滚
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  Check,
  ChevronDown,
  Eye,
  History,
  PencilLine,
  Sparkles,
  Square,
  Undo2,
} from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import MarkdownView from '@/components/workspace/MarkdownView.vue'
import ContentEditor from '@/components/workspace/ContentEditor.vue'
import VersionHistory from '@/components/workspace/VersionHistory.vue'
import { stageDef } from '@/agents/stages'
import { buildGenerateMessages } from '@/agents/context'
import { cancelStream, streamChat } from '@/api/llm'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { pushVersion } from '@/stores/projects'
import type { Chapter, NovelProject, SettingStageId, StageId, Version } from '@/types'

const props = defineProps<{
  project: NovelProject
  stageId: StageId
  chapter?: Chapter | null
}>()

const settings = useSettingsStore()
const ui = useUiStore()

/** 当前环节定义 */
const def = computed(() => stageDef(props.stageId))
/** 当前操作的数据对象（章节或设定环节） */
const data = computed(() =>
  props.stageId === 'chapter' && props.chapter
    ? props.chapter
    : props.project.stages[props.stageId as SettingStageId],
)
/** 视图标题：章节用章节名，设定环节用环节名 */
const title = computed(() =>
  props.stageId === 'chapter' && props.chapter
    ? props.chapter.title
    : def.value.name,
)
/** 创作要求输入（章节映射 notes，环节映射 userInput） */
const inputText = computed({
  get: () =>
    props.stageId === 'chapter' && props.chapter
      ? props.chapter.notes
      : (data.value as { userInput: string }).userInput,
  set: (value: string) => {
    if (props.stageId === 'chapter' && props.chapter) props.chapter.notes = value
    else (data.value as { userInput: string }).userInput = value
  },
})
/** 正文双向绑定：手动编辑已确认内容时自动降级为草稿 */
const contentModel = computed({
  get: () => data.value.content,
  set: (value: string) => {
    data.value.content = value
    if (data.value.status === 'confirmed') data.value.status = 'draft'
  },
})
/** 状态徽标文案 */
const statusLabel = computed(
  () =>
    ({ empty: '未开始', draft: '草稿', confirmed: '已确认' })[data.value.status],
)

const editing = ref(false)
const inputOpen = ref(true)
const streaming = ref(false)
const streamText = ref('')
const showVersions = ref(false)
const bodyRef = ref<HTMLElement | null>(null)

/** 会话代号：防止切换环节后过期流回调污染数据 */
let session = 0
let requestId = ''

/**
 * 发起流式生成：校验模型配置 → 存旧版本快照 → 流式接收正文
 */
function generate(): void {
  const binding = settings.bindingFor(props.stageId)
  const provider = settings.providerOf(binding)
  if (!provider || !binding.model) {
    ui.toast('请先在设置中配置模型服务商与默认模型', 'error')
    return
  }
  // 上游未确认时提醒但不阻断
  const pending = def.value.upstream.filter(
    (id) =>
      data.value.contextToggles[id] !== false &&
      props.project.stages[id].status === 'draft',
  )
  if (pending.length) {
    ui.toast('部分上游环节仍是草稿，建议先确认再生成', 'warning')
  }
  pushVersion(data.value, '重新生成前')
  const messages = buildGenerateMessages(
    props.project,
    props.stageId,
    binding.systemPrompt,
    data.value.contextToggles,
    inputText.value,
    props.chapter,
  )
  const current = ++session
  streaming.value = true
  editing.value = false
  streamText.value = ''
  requestId = streamChat(
    {
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: binding.model,
      messages,
      temperature: binding.temperature,
    },
    {
      onDelta: (text) => {
        if (current !== session) return
        streamText.value += text
      },
      onDone: () => {
        if (current !== session) return
        data.value.content = streamText.value.trim()
        data.value.status = 'draft'
        streaming.value = false
        ui.toast('生成完成，可预览、编辑或让 AI 继续调整', 'success')
      },
      onError: (message) => {
        if (current !== session) return
        streaming.value = false
        streamText.value = ''
        ui.toast(`生成失败：${message}`, 'error')
      },
    },
  )
}

/**
 * 停止生成：已收到的部分内容保留为草稿
 */
function stop(): void {
  session++
  if (requestId) cancelStream(requestId).catch(() => {})
  if (streamText.value.trim()) {
    data.value.content = streamText.value.trim()
    data.value.status = 'draft'
    ui.toast('已停止，部分内容已保留为草稿', 'info')
  } else {
    ui.toast('已停止生成', 'info')
  }
  streaming.value = false
}

/**
 * 确认当前内容为定稿（供下游环节作为上下文）
 */
function confirm(): void {
  if (!data.value.content.trim()) {
    ui.toast('内容为空，请先生成或编写内容', 'warning')
    return
  }
  data.value.status = 'confirmed'
  ui.toast('已确认，将作为下游环节的创作依据', 'success')
}

/**
 * 取消确认：回到草稿状态
 */
function unconfirm(): void {
  data.value.status = 'draft'
}

/**
 * 回滚到历史版本（回滚前先保存当前内容快照）
 * @param version 目标版本
 */
function rollback(version: Version): void {
  pushVersion(data.value, '回滚前')
  data.value.content = version.content
  data.value.status = 'draft'
  ui.toast('已回滚到所选版本', 'success')
}

// 流式输出时自动滚动到底部
watch(streamText, async () => {
  await nextTick()
  const el = bodyRef.value
  if (el) el.scrollTop = el.scrollHeight
})

// 离开视图时终止未完成的流
onUnmounted(() => {
  session++
  if (streaming.value && requestId) cancelStream(requestId).catch(() => {})
})
</script>

<template>
  <div class="stage-view">
    <header class="head">
      <div class="head-icon">
        <component :is="def.icon" :size="18" :stroke-width="1.8" />
      </div>
      <div class="head-info">
        <h2>{{ title }}</h2>
        <p>{{ def.description }}</p>
      </div>
      <span class="status-badge" :class="data.status">{{ statusLabel }}</span>
      <div class="segment" v-if="!streaming && data.content">
        <button
          class="seg-btn"
          :class="{ on: !editing }"
          title="预览"
          @click="editing = false"
        >
          <Eye :size="14" />
          预览
        </button>
        <button
          class="seg-btn"
          :class="{ on: editing }"
          title="编辑"
          @click="editing = true"
        >
          <PencilLine :size="14" />
          编辑
        </button>
      </div>
      <AppButton
        size="sm"
        variant="ghost"
        :disabled="streaming"
        @click="showVersions = true"
      >
        <History :size="14" />
        版本
      </AppButton>
    </header>

    <section class="input-block">
      <button class="input-toggle" @click="inputOpen = !inputOpen">
        <ChevronDown :size="14" class="chev" :class="{ open: inputOpen }" />
        {{ stageId === 'chapter' ? '本章创作备注' : '创作要求与灵感' }}
      </button>
      <Transition name="expand">
        <div v-show="inputOpen" class="input-wrap">
          <textarea
            v-model="inputText"
            class="app-textarea"
            rows="3"
            :placeholder="
              stageId === 'chapter'
                ? '本章想突出的剧情、情绪或写法要求（可留空，按大纲生成）…'
                : '写下你的灵感、偏好与要求，AI 会据此生成本环节内容（可留空）…'
            "
          />
        </div>
      </Transition>
    </section>

    <div ref="bodyRef" class="body">
      <MarkdownView v-if="streaming" :content="streamText" streaming />
      <ContentEditor v-else-if="editing" v-model="contentModel" />
      <MarkdownView v-else-if="data.content" :content="data.content" />
      <EmptyState
        v-else
        :icon="def.icon"
        :title="`还没有${stageId === 'chapter' ? '正文' : '内容'}`"
        description="填写上方创作要求后点击生成，AI 将结合上游已确认设定为你产出内容"
      />
    </div>

    <footer class="foot">
      <AppButton v-if="streaming" variant="danger" @click="stop">
        <Square :size="14" />
        停止生成
      </AppButton>
      <AppButton v-else variant="primary" @click="generate">
        <Sparkles :size="15" />
        {{ data.content ? '重新生成' : '生成' }}
      </AppButton>
      <AppButton
        v-if="data.status === 'confirmed'"
        variant="ghost"
        @click="unconfirm"
      >
        <Undo2 :size="14" />
        取消确认
      </AppButton>
      <AppButton
        v-else
        :disabled="streaming || !data.content.trim()"
        @click="confirm"
      >
        <Check :size="14" />
        确认
      </AppButton>
      <span class="foot-hint">
        {{
          data.status === 'confirmed'
            ? '已定稿 · 修改内容会自动回到草稿'
            : '确认后将作为下游环节的上下文'
        }}
      </span>
    </footer>

    <VersionHistory
      v-model:open="showVersions"
      :versions="data.versions"
      @rollback="rollback"
    />
  </div>
</template>

<style scoped>
.stage-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px 12px;
}
.head-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
}
.head-info {
  flex: 1;
  min-width: 0;
}
.head-info h2 {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.head-info p {
  margin-top: 1px;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 11.5px;
  font-weight: 600;
  transition:
    background var(--dur-base) var(--ease-apple),
    color var(--dur-base) var(--ease-apple);
}
.status-badge.empty {
  background: var(--bg-input);
  color: var(--text-tertiary);
}
.status-badge.draft {
  background: var(--accent-soft);
  color: var(--accent);
}
.status-badge.confirmed {
  background: var(--green-soft);
  color: var(--green);
}
.segment {
  display: flex;
  padding: 2px;
  border-radius: 9px;
  background: var(--bg-input);
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple),
    box-shadow var(--dur-fast) var(--ease-apple);
}
.seg-btn.on {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.input-block {
  padding: 0 24px;
}
.input-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease-apple);
}
.input-toggle:hover {
  color: var(--text);
}
.chev {
  transition: transform var(--dur-base) var(--ease-apple);
  transform: rotate(-90deg);
}
.chev.open {
  transform: rotate(0deg);
}
.input-wrap {
  overflow: hidden;
  padding-bottom: 8px;
}
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 4px 24px 0;
  padding: 20px 24px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px 16px;
}
.foot-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
</style>