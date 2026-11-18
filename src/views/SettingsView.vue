<script setup lang="ts">
/**
 * 设置页：模型服务管理（增删改/测试）、七环节智能体绑定矩阵（全局默认 + 逐环节覆盖）、外观主题
 */
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { Monitor, Moon, Plus, Sun } from 'lucide-vue-next'
import AppButton from '@/components/base/AppButton.vue'
import AppModal from '@/components/base/AppModal.vue'
import AppSelect from '@/components/base/AppSelect.vue'
import ProviderCard from '@/components/settings/ProviderCard.vue'
import ProviderForm from '@/components/settings/ProviderForm.vue'
import StageBindingRow from '@/components/settings/StageBindingRow.vue'
import { STAGES } from '@/agents/stages'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import type { Provider, Settings } from '@/types'

const settings = useSettingsStore()
const ui = useUiStore()

/** 服务商表单弹窗开关 */
const formOpen = ref(false)
/** 正在编辑的服务商（null 表示新建） */
const editing = ref<Provider | null>(null)
/** 待删除确认的服务商（null 表示弹窗关闭） */
const removing = ref<Provider | null>(null)

/**
 * 打开"添加模型服务"弹窗
 */
function openAdd(): void {
  editing.value = null
  formOpen.value = true
}

/**
 * 打开"编辑模型服务"弹窗
 * @param provider 要编辑的服务商
 */
function openEdit(provider: Provider): void {
  editing.value = provider
  formOpen.value = true
}

/**
 * 保存服务商：按 id 是否已存在分发到更新/新增
 * @param provider 表单产出的服务商对象
 */
function onSave(provider: Provider): void {
  const exists = settings.settings.providers.some((p) => p.id === provider.id)
  if (exists) {
    settings.updateProvider(provider)
    ui.toast('模型服务已更新', 'success')
  } else {
    settings.addProvider(provider)
    ui.toast('模型服务已添加', 'success')
  }
  formOpen.value = false
}

/**
 * 确认删除服务商（引用它的环节自动回退全局默认）
 */
function confirmRemove(): void {
  if (!removing.value) return
  const name = removing.value.name
  settings.removeProvider(removing.value.id)
  ui.toast(`已删除「${name}」`, 'success')
  removing.value = null
}

/** 全局默认服务商下拉选项 */
const defaultProviderOptions = computed(() => [
  { label: '未配置', value: '' },
  ...settings.settings.providers.map((p) => ({ label: p.name, value: p.id })),
])

/** 全局默认绑定的服务商对象 */
const defaultProvider = computed(() =>
  settings.settings.providers.find(
    (p) => p.id === settings.settings.defaultBinding.providerId,
  ),
)

/** 全局默认服务商代理：切换服务商时模型重置为其首个模型 */
const defaultProviderId = computed({
  get: () => settings.settings.defaultBinding.providerId,
  set: (value: string) => {
    settings.settings.defaultBinding.providerId = value
    const provider = settings.settings.providers.find((p) => p.id === value)
    settings.settings.defaultBinding.model = provider?.models[0] ?? ''
  },
})

/** 全局默认模型下拉选项 */
const defaultModelOptions = computed(() => {
  const provider = defaultProvider.value
  if (!provider) return [{ label: '请先选择服务商', value: '' }]
  if (!provider.models.length) return [{ label: '该服务商暂无模型', value: '' }]
  return provider.models.map((m) => ({ label: m, value: m }))
})

/** 全局默认模型下拉是否可用 */
const defaultModelDisabled = computed(
  () => !defaultProvider.value?.models.length,
)

/** 外观主题分段选项 */
const THEMES: { value: Settings['theme']; label: string; icon: Component }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]
</script>

<template>
  <div class="settings-view">
    <div class="settings-inner">
      <!-- 模型服务 -->
      <section class="section">
        <header class="section-head">
          <h2>模型服务</h2>
          <p>
            接入 OpenAI 兼容协议的大模型服务（DeepSeek、Kimi、通义千问、Ollama
            等），API Key 仅保存在本机。
          </p>
        </header>
        <div class="provider-grid">
          <ProviderCard
            v-for="p in settings.settings.providers"
            :key="p.id"
            :provider="p"
            @edit="openEdit(p)"
            @remove="removing = p"
          />
          <button class="add-card" @click="openAdd">
            <Plus :size="18" :stroke-width="1.8" />
            <span>添加模型服务</span>
          </button>
        </div>
      </section>

      <!-- 环节智能体 -->
      <section class="section">
        <header class="section-head">
          <h2>环节智能体</h2>
          <p>
            为每个创作环节指定服务商、模型、温度与系统提示词；选择「全局默认」即跟随下方默认配置。
          </p>
        </header>
        <div class="binding-card">
          <div class="row-grid default-row">
            <span class="default-label">全局默认</span>
            <AppSelect
              v-model="defaultProviderId"
              :options="defaultProviderOptions"
            />
            <AppSelect
              v-model="settings.settings.defaultBinding.model"
              :options="defaultModelOptions"
              :disabled="defaultModelDisabled"
            />
            <span />
            <span />
          </div>
          <div class="row-grid binding-head">
            <span>环节</span>
            <span>模型服务商</span>
            <span>模型</span>
            <span>温度</span>
            <span />
          </div>
          <StageBindingRow
            v-for="stage in STAGES"
            :key="stage.id"
            :stage-id="stage.id"
          />
        </div>
      </section>

      <!-- 外观 -->
      <section class="section">
        <header class="section-head">
          <h2>外观</h2>
          <p>选择应用主题，跟随系统时会随 macOS 深浅色自动切换。</p>
        </header>
        <div class="segmented">
          <button
            v-for="t in THEMES"
            :key="t.value"
            class="seg-item"
            :class="{ active: settings.settings.theme === t.value }"
            @click="settings.setTheme(t.value)"
          >
            <component :is="t.icon" :size="14" :stroke-width="1.8" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- 服务商新增/编辑弹窗 -->
    <ProviderForm v-model:open="formOpen" :provider="editing" @save="onSave" />

    <!-- 删除服务商确认 -->
    <AppModal
      :open="removing !== null"
      title="删除模型服务"
      @update:open="removing = null"
    >
      <p class="confirm-text">
        确定删除「{{ removing?.name }}」吗？引用它的环节将回退为全局默认绑定。
      </p>
      <template #footer>
        <AppButton variant="ghost" @click="removing = null">取消</AppButton>
        <AppButton variant="danger" @click="confirmRemove">删除</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
}
.settings-inner {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 28px 60px;
}
.section {
  margin-bottom: 36px;
}
.section-head {
  margin-bottom: 14px;
}
.section-head h2 {
  font-size: 17px;
  font-weight: 700;
}
.section-head p {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

/* 服务商卡片网格 */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 128px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-card);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition:
    border-color var(--dur-base) var(--ease-apple),
    color var(--dur-base) var(--ease-apple),
    background var(--dur-base) var(--ease-apple);
}
.add-card:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

/* 环节绑定矩阵 */
.binding-card {
  padding: 4px 18px 8px;
  background: var(--bg-elevated);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.row-grid {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) minmax(0, 1fr) 128px 32px;
  gap: 10px;
  align-items: center;
}
.default-row {
  padding: 12px 0;
  border-bottom: 0.5px solid var(--border);
}
.default-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}
.binding-head {
  padding: 10px 0 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-tertiary);
}

/* 主题分段控件（macOS 风格） */
.segmented {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: var(--bg-input);
}
.seg-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
  transition:
    background var(--dur-base) var(--ease-apple),
    color var(--dur-base) var(--ease-apple),
    box-shadow var(--dur-base) var(--ease-apple);
}
.seg-item:hover:not(.active) {
  color: var(--text);
}
.seg-item.active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: var(--shadow-card);
}

.confirm-text {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-secondary);
}
</style>
