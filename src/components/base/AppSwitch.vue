<script setup lang="ts">
/**
 * iOS 风格开关（v-model 布尔值）
 */
const model = defineModel<boolean>({ required: true })

/**
 * 切换开关状态
 */
function toggle(): void {
  model.value = !model.value
}
</script>

<template>
  <button
    class="app-switch"
    :class="{ on: model }"
    role="switch"
    :aria-checked="model"
    @click="toggle"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.app-switch {
  position: relative;
  width: 40px;
  height: 24px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--bg-active);
  transition: background var(--dur-base) var(--ease-apple);
}
.app-switch.on {
  background: var(--green);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform var(--dur-base) var(--ease-apple);
}
.app-switch.on .knob {
  transform: translateX(16px);
}
</style>
