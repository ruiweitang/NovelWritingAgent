<script setup lang="ts">
/**
 * 服务商新增/编辑弹窗：预设快填、Key 本机保存、模型管理（手动 + 拉取）、连接测试
 */
import { computed, ref, watch } from 'vue'
import { Download, Plus, X } from 'lucide-vue-next'
import AppModal from '@/components/base/AppModal.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import AppButton from '@/components/base/AppButton.vue'
import { fetchModels, testConnection } from '@/api/llm'
import { useUiStore } from '@/stores/ui'
import type { Provider } from '@/types'

const props = defineProps<{
  open: boolean
  /** 正在编辑的服务商；null 表示新建 */
  provider: Provider | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [provider: Provider]
}>()

/** 常用服务商预设（均为 OpenAI 兼容协议） */
const PRESETS = [
  { value: 'custom', label: '自定义服务', name: '', baseUrl: '' },
  { value: 'deepseek', label: 'DeepSeek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { value: 'kimi', label: 'Kimi（月之暗面）', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1' },
  { value: 'qwen', label: '通义千问（阿里百炼）', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'zhipu', label: '智谱 GLM', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { value: 'openai', label: 'OpenAI', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { value: 'ollama', label: 'Ollama（本地）', name: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
]

const ui = useUiStore()

const preset = ref('custom')
const name = ref('')
const baseUrl = ref('')
const apiKey = ref('')
const models = ref<string[]>([])
const modelInput = ref('')
const fetching = ref(false)
const testState = ref<'idle' | 'testing' | 'ok' | 'fail'>('idle')
const testMsg = ref('')

/** 弹窗标题：编辑 / 新增 */
const modalTitle = computed(() =>
  props.provider ? '编辑模型服务' : '添加模型服务',
)

/** 预设下拉选项 */
const presetOptions = PRESETS.map((p) => ({ label: p.label, value: p.value }))

// 打开弹窗时用编辑对象填充草稿（新建则重置）
watch(
  () => props.open,
  (open) => {
    if (!open) return
    const p = props.provider
    preset.value = p?.preset ?? 'custom'
    name.value = p?.name ?? ''
    baseUrl.value = p?.baseUrl ?? ''
    apiKey.value = p?.apiKey ?? ''
    models.value = [...(p?.models ?? [])]
    modelInput.value = ''
    fetching.value = false
    resetTest()
  },
)

/** 预设选择代理：应用预设时快填地址与名称 */
const presetModel = computed({
  get: () => preset.value,
  set: (value: string) => {
    preset.value = value
    const found = PRESETS.find((p) => p.value === value)
    if (found?.baseUrl) baseUrl.value = found.baseUrl
    if (found?.name && !name.value.trim()) name.value = found.name
    resetTest()
  },
})

/**
 * 重置连接测试状态
 */
function resetTest(): void {
  testState.value = 'idle'
  testMsg.value = ''
}

/**
 * 手动添加模型（去重、去空白）
 */
function addModel(): void {
  const m = modelInput.value.trim()
  if (!m) return
  if (!models.value.includes(m)) models.value.push(m)
  modelInput.value = ''
  resetTest()
}

/**
 * 移除指定模型
 * @param m 模型名
 */
function removeModel(m: string): void {
  models.value = models.value.filter((x) => x !== m)
  resetTest()
}

/**
 * 从服务商拉取可用模型列表（失败时提示手动添加）
 */
async function fetchModelList(): Promise<void> {
  if (!baseUrl.value.trim()) {
    ui.toast('请先填写 API 地址', 'warning')
    return
  }
  fetching.value = true
  try {
    const list = await fetchModels(baseUrl.value.trim(), apiKey.value.trim())
    for (const m of list) {
      if (!models.value.includes(m)) models.value.push(m)
    }
    ui.toast(`已拉取 ${list.length} 个模型`, 'success')
    resetTest()
  } catch {
    ui.toast('拉取模型列表失败，可手动添加模型', 'warning')
  } finally {
    fetching.value = false
  }
}

/**
 * 连接测试：用列表第一个模型发送一条极短消息
 */
async function runTest(): Promise<void> {
  if (!baseUrl.value.trim()) {
    ui.toast('请先填写 API 地址', 'warning')
    return
  }
  if (!models.value.length) {
    ui.toast('请先添加至少一个模型用于测试', 'warning')
    return
  }
  testState.value = 'testing'
  testMsg.value = ''
  try {
    const reply = await testConnection(
      baseUrl.value.trim(),
      apiKey.value.trim(),
      models.value[0],
    )
    testState.value = 'ok'
    testMsg.value = reply.trim().slice(0, 40)
  } catch (e) {
    testState.value = 'fail'
    testMsg.value = String(e)
  }
}

/**
 * 保存服务商：校验必填项后向父组件抛出完整对象
 */
function save(): void {
  const trimmedName = name.value.trim()
  const trimmedUrl = baseUrl.value.trim().replace(/\/+$/, '')
  if (!trimmedName) {
    ui.toast('请填写服务名称', 'warning')
    return
  }
  if (!trimmedUrl) {
    ui.toast('请填写 API 地址', 'warning')
    return
  }
  emit('save', {
    id: props.provider?.id ?? crypto.randomUUID(),
    name: trimmedName,
    baseUrl: trimmedUrl,
    apiKey: apiKey.value.trim(),
    models: [...models.value],
    preset: preset.value,
  })
  emit('update:open', false)
}

/**
 * 关闭弹窗
 */
function close(): void {
  emit('update:open', false)
}
</script>

<template>
  <AppModal
    :open="open"
    :title="modalTitle"
    :width="560"
    @update:open="emit('update:open', $event)"
  >
    <div class="form">
      <div class="field">
        <label class="field-label">服务商预设</label>
        <AppSelect v-model="presetModel" :options="presetOptions" />
      </div>
      <div class="field">
        <label class="field-label">显示名称</label>
        <AppInput v-model="name" placeholder="例如：DeepSeek 官方" />
      </div>
      <div class="field">
        <label class="field-label">API 地址（OpenAI 兼容协议）</label>
        <AppInput v-model="baseUrl" placeholder="https://api.example.com/v1" />
      </div>
      <div class="field">
        <label class="field-label">API Key</label>
        <AppInput
          v-model="apiKey"
          type="password"
          placeholder="sk-…（Ollama 等本地服务可留空）"
        />
        <p class="field-hint">Key 仅保存在本机，除模型服务外不会上传到任何服务器</p>
      </div>
      <div class="field">
        <label class="field-label">可用模型</label>
        <div v-if="models.length" class="chips">
          <span v-for="m in models" :key="m" class="chip">
            {{ m }}
            <button class="chip-x" title="移除模型" @click="removeModel(m)">
              <X :size="11" />
            </button>
          </span>
        </div>
        <div class="model-row">
          <AppInput
            v-model="modelInput"
            placeholder="输入模型名，回车添加"
            @keyup.enter="addModel"
          />
          <AppButton @click="addModel">
            <Plus :size="14" />
            添加
          </AppButton>
          <AppButton :loading="fetching" @click="fetchModelList">
            <Download :size="14" />
            拉取
          </AppButton>
        </div>
        <p class="field-hint">点击「拉取」自动获取服务商模型列表，失败时可手动添加</p>
      </div>
      <div class="test-row">
        <AppButton
          size="sm"
          :loading="testState === 'testing'"
          @click="runTest"
        >
          测试连接
        </AppButton>
        <span v-if="testState === 'ok'" class="test-ok">
          连接成功{{ testMsg ? `：${testMsg}` : '' }}
        </span>
        <span
          v-else-if="testState === 'fail'"
          class="test-fail"
          :title="testMsg"
        >
          {{ testMsg }}
        </span>
        <span v-else class="field-hint">使用列表第一个模型发送一条测试消息</span>
      </div>
    </div>
    <template #footer>
      <AppButton variant="ghost" @click="close">取消</AppButton>
      <AppButton variant="primary" @click="save">保存</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 10px;
  border-radius: var(--radius-full);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
}
.chip-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  color: var(--accent);
  transition: background var(--dur-fast) var(--ease-apple);
}
.chip-x:hover {
  background: var(--accent);
  color: var(--accent-text);
}
.model-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.model-row .app-input {
  flex: 1;
}
.test-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
}
.test-ok {
  font-size: 12.5px;
  color: var(--green);
}
.test-fail {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  color: var(--red);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
