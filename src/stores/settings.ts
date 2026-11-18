/**
 * 全局设置 store：服务商、环节智能体绑定、主题（防抖自动保存）
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import * as api from '@/api/storage'
import { STAGES } from '@/agents/stages'
import type { AgentBinding, Provider, Settings, StageId } from '@/types'

/**
 * 构造默认设置：七环节各一份默认提示词绑定
 */
export function defaultSettings(): Settings {
  const stageBindings = {} as Record<StageId, AgentBinding>
  for (const stage of STAGES) {
    stageBindings[stage.id] = {
      providerId: '',
      model: '',
      temperature: 0.8,
      systemPrompt: stage.defaultPrompt,
    }
  }
  return {
    providers: [],
    defaultBinding: { providerId: '', model: '' },
    stageBindings,
    theme: 'system',
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(defaultSettings())
  const loaded = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let media: MediaQueryList | null = null

  /**
   * 加载设置：与默认值合并（保证七环节绑定齐全），并启动自动保存与主题监听
   */
  async function load(): Promise<void> {
    const raw = await api.getSettings()
    if (raw) {
      const base = defaultSettings()
      settings.value = {
        providers: raw.providers ?? [],
        defaultBinding: raw.defaultBinding ?? base.defaultBinding,
        theme: raw.theme ?? 'system',
        stageBindings: base.stageBindings,
      }
      for (const stage of STAGES) {
        const saved = raw.stageBindings?.[stage.id]
        if (saved) {
          settings.value.stageBindings[stage.id] = {
            providerId: saved.providerId ?? '',
            model: saved.model ?? '',
            temperature: saved.temperature ?? 0.8,
            systemPrompt: saved.systemPrompt?.trim()
              ? saved.systemPrompt
              : stage.defaultPrompt,
          }
        }
      }
    }
    loaded.value = true
    applyTheme()
    // 跟随系统主题变化
    media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', () => {
      if (settings.value.theme === 'system') applyTheme()
    })
    watch(settings, scheduleSave, { deep: true })
  }

  /**
   * 防抖 400ms 保存设置到本地
   */
  function scheduleSave(): void {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      api
        .saveSettings(JSON.parse(JSON.stringify(settings.value)))
        .catch((e) => console.error('保存设置失败', e))
    }, 400)
  }

  /**
   * 应用主题：在 html 上设置 data-theme（system 时按系统偏好解析）
   */
  function applyTheme(): void {
    const theme = settings.value.theme
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme
    document.documentElement.dataset.theme = resolved
  }

  /**
   * 切换主题
   * @param theme system / light / dark
   */
  function setTheme(theme: Settings['theme']): void {
    settings.value.theme = theme
    applyTheme()
  }

  /**
   * 解析环节的有效绑定：providerId/model 为空时回退全局默认绑定
   * @param stageId 环节 id
   */
  function bindingFor(stageId: StageId): AgentBinding {
    const binding = settings.value.stageBindings[stageId]
    const fallback = settings.value.defaultBinding
    return {
      ...binding,
      providerId: binding.providerId || fallback.providerId,
      model: binding.model || fallback.model,
    }
  }

  /**
   * 获取绑定对应的服务商对象
   * @param binding 有效绑定
   */
  function providerOf(binding: AgentBinding): Provider | undefined {
    return settings.value.providers.find((p) => p.id === binding.providerId)
  }

  /**
   * 新增服务商；若是第一个服务商则设为全局默认
   * @param provider 服务商对象
   */
  function addProvider(provider: Provider): void {
    settings.value.providers.push(provider)
    if (settings.value.providers.length === 1) {
      settings.value.defaultBinding = {
        providerId: provider.id,
        model: provider.models[0] ?? '',
      }
    }
  }

  /**
   * 更新服务商
   * @param provider 服务商对象（按 id 覆盖）
   */
  function updateProvider(provider: Provider): void {
    const index = settings.value.providers.findIndex((p) => p.id === provider.id)
    if (index >= 0) settings.value.providers[index] = provider
  }

  /**
   * 删除服务商，并清空引用它的环节绑定与默认绑定
   * @param id 服务商 id
   */
  function removeProvider(id: string): void {
    settings.value.providers = settings.value.providers.filter((p) => p.id !== id)
    for (const stage of STAGES) {
      const binding = settings.value.stageBindings[stage.id]
      if (binding.providerId === id) {
        binding.providerId = ''
        binding.model = ''
      }
    }
    if (settings.value.defaultBinding.providerId === id) {
      const first = settings.value.providers[0]
      settings.value.defaultBinding = {
        providerId: first?.id ?? '',
        model: first?.models[0] ?? '',
      }
    }
  }

  return {
    settings,
    loaded,
    load,
    setTheme,
    bindingFor,
    providerOf,
    addProvider,
    updateProvider,
    removeProvider,
  }
})
