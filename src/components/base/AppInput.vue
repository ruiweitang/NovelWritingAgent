<script setup lang="ts">
/**
 * 通用单行输入框（v-model 双向绑定）
 */
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    placeholder?: string
    type?: string
    disabled?: boolean
  }>(),
  { placeholder: '', type: 'text', disabled: false },
)
</script>

<template>
  <input
    v-model="model"
    class="app-input"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
  />
</template>
