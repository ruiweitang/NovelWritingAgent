<script setup lang="ts">
/**
 * 工作台右侧智能体面板：本环节模型绑定（服务商/模型/温度/提示词）、
 * 上游上下文勾选、AI 调整对话
 */
import { computed, ref } from 'vue'
import { Bot, PanelRightClose, SlidersHorizontal } from 'lucide-vue-next'
import AppSelect from '@/components/base/AppSelect.vue'
import AppSwitch from '@/components/base/AppSwitch.vue'
import AppButton from '@/components/base/AppButton.vue'
import ChatAdjust from '@/components/workspace/ChatAdjust.vue'
import PromptEditor from '@/components/settings/PromptEditor.vue'
import { stageDef } from '@/agents/stages'
import { useSettingsStore } from '@/stores/settings'
import type { Chapter, NovelProject, SettingStageId, StageId } from '@/types'

const props = defineProps<{
  project: NovelProject
  stageId: StageId
  chapter?: Chapter | null
}>()

const emit = defineEmits<{ collapse: [] }>()

const settings = useSettingsStore()
const showPrompt = ref(false)

/** 本环节原始绑定（不含全局默认回退） */
const binding = computed(() => settings.settings.stageBindings[props.stageId])

/** 当前操作的数据对象（章节或设定环节） */
const data = computed(() =>
  props.stageId === 'chapter' && props.chapter
    ? props.chapter
    : props.project.stages[props.stageId as SettingStageId],
)

/** 服务商下拉选项（空值 = 跟随全局默认） */
const providerOptions = computed(() => [
  { label: '默认（全局）', value: '' },
  ...settings.settings.providers.map((p) => ({ label: p.name, value: p.id })),
])

/** 服务商绑定代理：切换服务商时清空模型选择 */
const providerModel = computed({
  get: () => binding.value.providerId,
  set: (value: string) => {
    binding.value.providerId = value
    binding.value.model = ''
  },
})

/** 有效服务商的模型列表（空值 = 跟随全局默认） */
const modelOptions = computed(() => {
  const effective = settings.bindingFor(props.stageId)
  const provider = settings.providerOf(effective)
  return [
    { label: '默认（全局）', value: '' },
    ...(provider?.models ?? []).map((m) => ({ label: m, value: m })),
  ]
})

/** 本环节的上游环节定义列表 */
const upstreamStages = computed(() =>
  stageDef(props.stageId).upstream.map((id) => ({
    id,
    def: stageDef(id),
    status: props.project.stages[id].status,
  })),
)

/**
 * 读取上游勾选状态（缺省视为开启）
 * @param id 上游环节 id
 */
function isToggled(id: SettingStageId): boolean {
  return data.value.contextToggles[id] !== false
}

/**
 * 设置上游勾选状态
 * @param id 上游环节 id
 * @param value 是否纳入上下文
 */
function setToggle(id: SettingStageId, value: boolean): void {
  data.value.contextToggles[id] = value
}
</script>

<template>
  <aside class="agent-panel">
    <header class="panel-head">
      <div class="panel-title">
        <Bot :size="16" :stroke-width="1.8" />
        <span>环节智能体</span>
      </div>
      <button class="collapse-btn" title="收起面板" @click="emit('collapse')">
        <PanelRightClose :size="15" />
      </button>
    </header>

    <section class="config">
      <div class="field">
        <label class="field-label">模型服务商</label>
        <AppSelect v-model="providerModel" :options="providerOptions" />
      </div>
      <div class="field">
        <label class="field-label">模型</label>
        <AppSelect v-model="binding.model" :options="modelOptions" />
      </div>
      <div class="field">
        <label class="field-label">
          温度
          <span class="temp-value">{{ binding.temperature.toFixed(2) }}</span>
        </label>
        <input
          v-model.number="binding.temperature"
          class="temp-range"
          type="range"
          min="0"
          max="1.5"
          step="0.05"
        />
        <p class="field-hint">越低越稳定严谨，越高越有创意与变化</p>
      </div>
      <AppButton size="sm" variant="secondary" @click="showPrompt = true">
        <SlidersHorizontal :size="14" />
        编辑提示词
      </AppButton>
    </section>

    <section v-if="upstreamStages.length" class="context">
      <h4 class="section-title">上游上下文</h4>
      <div
        v-for="item in upstreamStages"
        :key="item.id"
        class="context-row"
      >
        <component :is="item.def.icon" :size="14" :stroke-width="1.8" />
        <span class="context-name">{{ item.def.name }}</span>
        <span class="dot" :class="item.status" :title="item.status" />
        <AppSwitch
          :model-value="isToggled(item.id)"
          @update:model-value="setToggle(item.id, $event)"
        />
      </div>
      <p class="field-hint">勾选的已确认/草稿设定会作为上下文提供给 AI</p>
    </section>

    <ChatAdjust
      :project="project"
      :stage-id="stageId"
      :chapter="chapter"
    />

    <PromptEditor v-model:open="showPrompt" :stage-id="stageId" />
  </aside>
</template>

<style scoped>
.agent-panel {
  display: flex;
  flex-direction: column;
  width: 300px;
  flex-shrink: 0;
  min-height: 0;
  background: var(--bg-elevated);
  border-left: 0.5px solid var(--border);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.panel-title svg {
  color: var(--accent);
}
.collapse-btn {
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
.collapse-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 16px 14px;
  border-bottom: 0.5px solid var(--border);
}
.temp-value {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
.field-label {
  display: flex;
  align-items: center;
}
.temp-range {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}
.context {
  padding: 12px 16px;
  border-bottom: 0.5px solid var(--border);
}
.section-title {
  margin-bottom: 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: var(--text-tertiary);
}
.context-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  color: var(--text-secondary);
}
.context-name {
  flex: 1;
  font-size: 12.5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dot.empty {
  background: var(--text-tertiary);
  opacity: 0.5;
}
.dot.draft {
  background: var(--accent);
}
.dot.confirmed {
  background: var(--green);
}
.context .field-hint {
  margin-top: 6px;
}
</style>
