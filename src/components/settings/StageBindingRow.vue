<script setup lang="ts">
/**
 * 环节智能体绑定行：服务商/模型（空值回退全局默认）、温度、系统提示词入口
 */
import { computed, ref } from 'vue'
import { FileText } from 'lucide-vue-next'
import AppSelect from '@/components/base/AppSelect.vue'
import PromptEditor from '@/components/settings/PromptEditor.vue'
import { stageDef } from '@/agents/stages'
import { useSettingsStore } from '@/stores/settings'
import type { StageId } from '@/types'

const props = defineProps<{ stageId: StageId }>()

const settings = useSettingsStore()
const showPrompt = ref(false)

/** 环节定义（图标与名称） */
const def = computed(() => stageDef(props.stageId))

/** 本环节原始绑定（不含全局默认回退） */
const binding = computed(() => settings.settings.stageBindings[props.stageId])

/** 服务商下拉选项（空值 = 跟随全局默认） */
const providerOptions = computed(() => [
  { label: '全局默认', value: '' },
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

/** 有效服务商的模型列表 */
const modelOptions = computed(() => {
  const effective = settings.bindingFor(props.stageId)
  const provider = settings.providerOf(effective)
  return [
    { label: '全局默认', value: '' },
    ...(provider?.models ?? []).map((m) => ({ label: m, value: m })),
  ]
})
</script>

<template>
  <div class="binding-row">
    <div class="row-grid">
      <div class="stage-cell">
        <component :is="def.icon" :size="15" :stroke-width="1.8" />
        <span>{{ def.name }}</span>
      </div>
      <AppSelect v-model="providerModel" :options="providerOptions" />
      <AppSelect v-model="binding.model" :options="modelOptions" />
      <div class="temp-cell">
        <input
          v-model.number="binding.temperature"
          class="temp-range"
          type="range"
          min="0"
          max="1.5"
          step="0.05"
        />
        <span class="temp-num">{{ binding.temperature.toFixed(2) }}</span>
      </div>
      <button
        class="prompt-btn"
        title="编辑系统提示词"
        @click="showPrompt = true"
      >
        <FileText :size="15" />
      </button>
    </div>
    <PromptEditor v-model:open="showPrompt" :stage-id="stageId" />
  </div>
</template>

<style scoped>
.binding-row {
  border-bottom: 0.5px solid var(--border);
}
.binding-row:last-child {
  border-bottom: none;
}
.row-grid {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) minmax(0, 1fr) 128px 32px;
  gap: 10px;
  align-items: center;
  padding: 9px 0;
}
.stage-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.stage-cell svg {
  color: var(--accent);
  flex-shrink: 0;
}
.temp-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.temp-range {
  flex: 1;
  min-width: 0;
  accent-color: var(--accent);
  cursor: pointer;
}
.temp-num {
  width: 32px;
  flex-shrink: 0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
  text-align: right;
}
.prompt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  transition:
    background var(--dur-fast) var(--ease-apple),
    color var(--dur-fast) var(--ease-apple);
}
.prompt-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
</style>
