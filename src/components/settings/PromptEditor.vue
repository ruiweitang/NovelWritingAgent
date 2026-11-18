<script setup lang="ts">
/**
 * 环节系统提示词编辑弹窗：支持恢复默认、保存（留空回退默认提示词）
 */
import { ref, watch } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppButton from '@/components/base/AppButton.vue'
import { stageDef } from '@/agents/stages'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import type { StageId } from '@/types'

const props = defineProps<{
  open: boolean
  stageId: StageId
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const settings = useSettingsStore()
const ui = useUiStore()
const draft = ref('')

// 打开弹窗时用当前绑定提示词填充草稿
watch(
  () => props.open,
  (open) => {
    if (open) draft.value = settings.settings.stageBindings[props.stageId].systemPrompt
  },
)

/**
 * 恢复该环节的默认提示词到草稿
 */
function resetDefault(): void {
  draft.value = stageDef(props.stageId).defaultPrompt
}

/**
 * 保存提示词（留空则回退默认提示词）并关闭弹窗
 */
function save(): void {
  const binding = settings.settings.stageBindings[props.stageId]
  binding.systemPrompt = draft.value.trim()
    ? draft.value
    : stageDef(props.stageId).defaultPrompt
  emit('update:open', false)
  ui.toast('提示词已保存', 'success')
}
</script>

<template>
  <AppModal
    :open="open"
    :title="`编辑提示词 · ${stageDef(stageId).name}`"
    :width="640"
    @update:open="emit('update:open', $event)"
  >
    <p class="field-hint intro">
      提示词决定该环节智能体的角色与输出结构。生成与 AI 调整时都会附加项目信息与勾选的上游设定。
    </p>
    <textarea v-model="draft" class="app-textarea prompt-area" rows="14" />
    <template #footer>
      <AppButton variant="ghost" @click="resetDefault">
        <RotateCcw :size="14" />
        恢复默认
      </AppButton>
      <AppButton variant="secondary" @click="emit('update:open', false)">
        取消
      </AppButton>
      <AppButton variant="primary" @click="save">保存</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.intro {
  margin-bottom: 10px;
}
.prompt-area {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12.5px;
  line-height: 1.65;
}
</style>
