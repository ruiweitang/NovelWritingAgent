<script setup lang="ts">
/**
 * 通用弹窗：Teleport + 弹性缩放过渡，支持 Esc / 遮罩点击关闭
 */
import { watch, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: number
  }>(),
  { width: 480 },
)

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

/**
 * 关闭弹窗
 */
function close(): void {
  emit('update:open', false)
}

/**
 * Esc 键关闭
 * @param event 键盘事件
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

// 打开时监听 Esc，关闭时移除
watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-backdrop" @click.self="close">
        <div class="modal-card" :style="{ width: `${width}px` }">
          <div class="modal-head">
            <h3>{{ title }}</h3>
            <button class="modal-x" @click="close">
              <X :size="15" />
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-foot">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--backdrop);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.modal-card {
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-radius: var(--radius-modal);
  border: 0.5px solid var(--border);
  box-shadow: var(--shadow-modal);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}
.modal-head h3 {
  font-size: 15px;
  font-weight: 700;
}
.modal-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  color: var(--text-secondary);
  transition: background var(--dur-fast) var(--ease-apple);
}
.modal-x:hover {
  background: var(--bg-active);
  color: var(--text);
}
.modal-body {
  padding: 4px 20px 16px;
  overflow-y: auto;
}
.modal-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 0.5px solid var(--border);
}
</style>
